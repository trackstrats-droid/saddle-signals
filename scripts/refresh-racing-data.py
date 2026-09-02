#!/usr/bin/env python3
"""Build the Saddle Signals snapshot from The Racing API."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
import json
from pathlib import Path
import re
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
REQUEST = Path.home() / ".codex" / "skills" / "the-racing-api" / "scripts" / "request.py"
AMATEUR = re.compile(r"^(?:Mr|Mrs|Miss|Ms)\s", re.I)
CLAIM = re.compile(r"\((\d+)\)\s*$")
EXCHANGE_MARKERS = ("exchange", "smarkets", "matchbook", "betdaq", "bet daq")


def api(path: str, **query: str) -> dict:
    command = [sys.executable, str(REQUEST), path]
    for key, value in query.items():
        command.extend(["--query", f"{key}={value}"])
    last_error = None
    for attempt in range(3):
        try:
            completed = subprocess.run(command, check=True, capture_output=True)
            return json.loads(completed.stdout)
        except subprocess.CalledProcessError as error:
            last_error = error
            time.sleep(0.75 * (attempt + 1))
    raise last_error  # type: ignore[misc]


def rider_name(value: str | None) -> str:
    return CLAIM.sub("", value or "").strip().rstrip(".")


def claim(value: str | None) -> int:
    match = CLAIM.search(value or "")
    return int(match.group(1)) if match else 0


def lto_for(horse_id: str, race_date: str) -> dict | None:
    payload = api(f"/v1/racecards/{horse_id}/results")
    for result in payload.get("results", []):
        if (result.get("date") or "") >= race_date:
            continue
        runner = next((item for item in result.get("runners", []) if item.get("horse_id") == horse_id), None)
        if runner:
            return {
                "jockey": runner.get("jockey") or "Unknown",
                "claim": int(runner.get("jockey_claim_lbs") or 0),
                "date": result.get("date") or "",
                "course": result.get("course") or "Unknown",
                "position": runner.get("position") or "–",
                "fieldSize": len(result.get("runners", [])),
                "distance": result.get("dist") or "–",
                "distanceF": float(result.get("dist_y") or 0) / 220,
            }
    return None


def distance_label(value: str | None) -> str:
    try:
        return f"{float(value):.1f}f"
    except (TypeError, ValueError):
        return value or "–"


def course_distance_flag(values: list[str] | None) -> str:
    flags = {str(value).upper() for value in (values or [])}
    if "CD" in flags or {"C", "D"}.issubset(flags):
        return "CD"
    if "C" in flags:
        return "C"
    if "D" in flags:
        return "D"
    return ""


def best_bookmaker_odds(values: list[dict] | None) -> dict | None:
    best = None
    for price in values or []:
        bookmaker = str(price.get("bookmaker") or "").strip()
        normalised = bookmaker.casefold()
        if any(marker in normalised for marker in EXCHANGE_MARKERS):
            continue
        try:
            decimal = float(price.get("decimal"))
        except (TypeError, ValueError):
            continue
        if decimal <= 1:
            continue
        if best is None or decimal > best[0]:
            best = (decimal, {
                "fractional": str(price.get("fractional") or decimal),
                "decimal": decimal,
                "bookmaker": bookmaker,
                "isStartingPrice": False,
            })
    return best[1] if best else None


def starting_price(runner: dict | None) -> dict | None:
    if not runner:
        return None
    try:
        decimal = float(runner.get("sp_dec"))
    except (TypeError, ValueError):
        return None
    if decimal <= 1:
        return None
    return {
        "fractional": str(runner.get("sp") or decimal),
        "decimal": decimal,
        "bookmaker": "SP",
        "isStartingPrice": True,
    }


def today_results() -> dict[str, dict]:
    first = api("/v1/results/today", limit="100")
    results = list(first.get("results", []))
    total = int(first.get("total") or len(results))
    for skip in range(100, total, 100):
        results.extend(api("/v1/results/today", limit="100", skip=str(skip)).get("results", []))
    return {race["race_id"]: race for race in results if race.get("region") == "GB" and race.get("race_id")}


def market_positions(race: dict, result: dict | None = None) -> dict[str, str]:
    priced = []
    for runner in (result or race).get("runners", []):
        odds = starting_price(runner) if result else best_bookmaker_odds(runner.get("odds"))
        if odds and runner.get("horse_id"):
            priced.append((runner["horse_id"], odds["decimal"]))
    if not priced:
        return {}
    distinct_prices = sorted({price for _, price in priced})
    favourite_price = distinct_prices[0]
    top_three_prices = set(distinct_prices[:3])
    ordered_prices = sorted(price for _, price in priced)
    halfway_price = ordered_prices[(len(ordered_prices) - 1) // 2]
    positions = {}
    for horse_id, price in priced:
        if price == favourite_price:
            positions[horse_id] = "favourite"
        elif price in top_three_prices:
            positions[horse_id] = "top3"
        elif price <= halfway_price:
            positions[horse_id] = "midfield"
        else:
            positions[horse_id] = "outsider"
    return positions


def jockey_30_day(jockey_id: str) -> dict:
    end = date.today()
    start = end - timedelta(days=30)
    payload = api(
        f"/v1/jockeys/{jockey_id}/analysis/courses",
        start_date=start.isoformat(),
        end_date=end.isoformat(),
    )
    courses = payload.get("courses", [])
    rides = sum(int(item.get("rides") or 0) for item in courses)
    wins = sum(int(item.get("1st") or 0) for item in courses)
    return {"wins": wins, "rides": rides, "strikeRate": round(100 * wins / rides, 1) if rides else 0}


def build_day(day_key: str, watchlists: dict[str, list[str]]) -> dict:
    races = [race for race in api("/v1/racecards/standard", day=day_key).get("racecards", []) if race.get("region") == "GB"]
    settled = today_results() if day_key == "today" else {}
    race_market_positions = {race["race_id"]: market_positions(race, settled.get(race["race_id"])) for race in races}
    runners = [(race, runner) for race in races for runner in race.get("runners", [])]
    candidates = []
    for race, runner in runners:
        discipline = "flat" if race.get("type") == "Flat" else "jumps"
        current_name = rider_name(runner.get("jockey"))
        current_claim = claim(runner.get("jockey"))
        if current_name in watchlists[discipline] or current_claim > 0:
            candidates.append((race, runner, discipline, current_name, current_claim))

    histories: dict[str, dict | None] = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(lto_for, runner["horse_id"], race["date"]): runner["horse_id"]
            for race, runner, _, _, _ in candidates
            if runner.get("horse_id")
        }
        for future in as_completed(futures):
            horse_id = futures[future]
            try:
                histories[horse_id] = future.result()
            except subprocess.CalledProcessError:
                histories[horse_id] = None

    flags = []
    for race, runner, discipline, current_name, current_claim in candidates:
        previous = histories.get(runner.get("horse_id", ""))
        if not previous:
            continue
        previous_name = rider_name(previous["jockey"])
        signals = []
        if current_name in watchlists[discipline] and previous_name != current_name and previous_name not in watchlists[discipline]:
            signals.append("upgrade")
        if current_claim > 0 and previous["claim"] == 0 and not AMATEUR.match(runner.get("jockey") or ""):
            signals.append("claimer")
        if not signals:
            continue
        settled_runner = next((item for item in settled.get(race["race_id"], {}).get("runners", []) if item.get("horse_id") == runner.get("horse_id")), None)
        flags.append({
            "id": f"{race['race_id']}-{runner['horse_id']}",
            "date": race.get("date") or "",
            "course": race.get("course") or "Unknown",
            "offTime": race.get("off_time") or "–",
            "raceName": race.get("race_name") or "Unnamed race",
            "raceType": race.get("type") or "Other",
            "distance": distance_label(race.get("distance_f")),
            "raceClass": race.get("race_class") or "–",
            "horse": runner.get("horse") or "Unknown",
            "horseNumber": runner.get("number") or "NR",
            "trainer": runner.get("trainer") or "Unknown",
            "todayJockey": runner.get("jockey") or "Unknown",
            "todayJockeyId": runner.get("jockey_id") or "",
            "todayClaim": current_claim,
            "silkUrl": runner.get("silk_url") or "",
            "bestOdds": starting_price(settled_runner) or best_bookmaker_odds(runner.get("odds")),
            "marketPosition": race_market_positions.get(race["race_id"], {}).get(runner.get("horse_id")),
            "courseDistance": course_distance_flag(runner.get("past_results_flags")),
            "ltoJockey": previous["jockey"],
            "ltoClaim": previous["claim"],
            "ltoDate": previous["date"],
            "ltoCourse": previous["course"],
            "ltoPosition": previous["position"],
            "ltoFieldSize": previous["fieldSize"],
            "ltoDistance": previous["distance"],
            "sameCourse": (race.get("course") or "").strip().casefold() == previous["course"].strip().casefold(),
            "sameDistance": abs(float(race.get("distance_f") or 0) - previous["distanceF"]) <= 0.25,
            "flags": signals,
        })
    jockey_stats: dict[str, dict | None] = {}
    jockey_ids = {item["todayJockeyId"] for item in flags if item["todayJockeyId"]}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(jockey_30_day, jockey_id): jockey_id for jockey_id in jockey_ids}
        for future in as_completed(futures):
            jockey_id = futures[future]
            try:
                jockey_stats[jockey_id] = future.result()
            except subprocess.CalledProcessError:
                jockey_stats[jockey_id] = None
    for item in flags:
        item["jockey30Day"] = jockey_stats.get(item["todayJockeyId"])
    flags.sort(key=lambda item: (item["course"], item["offTime"], item["horseNumber"], item["horse"]))
    return {
        "races": len(races),
        "runners": len(runners),
        "courses": sorted({race.get("course") for race in races if race.get("course")}),
        "flags": flags,
    }


def main() -> None:
    existing = json.loads((ROOT / "app" / "racing-data.json").read_text(encoding="utf-8"))
    output = {
        "generatedAt": date.today().isoformat(),
        "watchlists": existing["watchlists"],
        "today": build_day("today", existing["watchlists"]),
        "tomorrow": build_day("tomorrow", existing["watchlists"]),
    }
    rendered = json.dumps(output, indent=2, ensure_ascii=False) + "\n"
    (ROOT / "app" / "racing-data.json").write_text(rendered, encoding="utf-8")
    (ROOT / "public" / "racing-data.json").write_text(rendered, encoding="utf-8")
    print(json.dumps({
        "generatedAt": output["generatedAt"],
        "today": {"races": output["today"]["races"], "runners": output["today"]["runners"], "signals": len(output["today"]["flags"])},
        "tomorrow": {"races": output["tomorrow"]["races"], "runners": output["tomorrow"]["runners"], "signals": len(output["tomorrow"]["flags"])},
    }, indent=2))


if __name__ == "__main__":
    main()
