"use client";

import { useEffect, useMemo, useState } from "react";
import fallbackData from "./racing-data.json";
import { captureAnalytics } from "./analytics";
import saddleSignalsLogo from "../public/saddle-signals.png";

type DayKey = "today" | "tomorrow";
type AlertFlag = "upgrade" | "claimer";
type SortKey = "card" | "time_asc" | "time_desc" | "odds_asc" | "odds_desc" | "sr_desc" | "sr_asc";
type RacingData = typeof fallbackData;
type Alert = (typeof fallbackData.tomorrow.flags)[number] & { silkUrl?: string };
type CustomerSession = { loading: boolean; authenticated: boolean; customer?: { id: string; email?: string; firstName?: string; lastName?: string } };

const labels: Record<AlertFlag, string> = { upgrade: "Jockey upgrade", claimer: "New claimer" };
const amateurTitle = /^(?:Mr|Mrs|Miss|Ms)\s/i;

export default function Home() {
  const [racingData, setRacingData] = useState<RacingData>(fallbackData);
  const [day, setDay] = useState<DayKey>("today");
  const [course, setCourse] = useState("all");
  const [flag, setFlag] = useState("all");
  const [raceType, setRaceType] = useState("all");
  const [courseDistance, setCourseDistance] = useState("all");
  const [ltoResult, setLtoResult] = useState("all");
  const [jockey, setJockey] = useState("all");
  const [jockeyStrikeRate, setJockeyStrikeRate] = useState("all");
  const [marketPosition, setMarketPosition] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("card");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [session, setSession] = useState<CustomerSession>({ loading: true, authenticated: false });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/racing-data", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Snapshot unavailable")))
      .then((data: RacingData) => setRacingData(data))
      .catch((error) => { if (error.name !== "AbortError") console.warn("Using bundled racing snapshot"); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((value) => setSession({ ...value, loading: false }))
      .catch((error) => { if (error.name !== "AbortError") setSession({ loading: false, authenticated: false }); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    const authEvent = url.searchParams.get("auth_event");
    if (!authEvent) return;
    captureAnalytics(`toolkit_${authEvent}`, { source: "saddle_signals" });
    url.searchParams.delete("auth_event");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileNavOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("navOpen");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("navOpen");
    };
  }, [mobileNavOpen]);
  const current = racingData[day];
  const alerts = (current.flags as Alert[]).map((item) => amateurTitle.test(item.todayJockey)
    ? { ...item, flags: item.flags.filter((itemFlag) => itemFlag !== "claimer") }
    : item).filter((item) => item.flags.length > 0);
  const courses = [...new Set(alerts.map((item) => item.course))].sort();
  const jockeys = [...new Set(alerts.map((item) => item.todayJockey))].sort();
  const activeCount = [course, flag, raceType, courseDistance, ltoResult, jockey, jockeyStrikeRate, marketPosition].filter((value) => value !== "all").length;
  const filtered = useMemo(() => alerts.filter((item) =>
    (course === "all" || item.course === course) &&
    (flag === "all" || item.flags.includes(flag)) &&
    (raceType === "all" || item.raceType === raceType) &&
    (courseDistance === "all" || item.courseDistance === courseDistance) &&
    (ltoResult === "all" || (ltoResult === "winner" ? item.ltoPosition === "1" : ["2", "3"].includes(item.ltoPosition))) &&
    (jockey === "all" || item.todayJockey === jockey) &&
    (jockeyStrikeRate === "all" || (item.jockey30Day?.strikeRate ?? -1) >= Number(jockeyStrikeRate)) &&
    (marketPosition === "all" || item.marketPosition === marketPosition || (marketPosition === "top3" && item.marketPosition === "favourite"))), [alerts, course, flag, raceType, courseDistance, ltoResult, jockey, jockeyStrikeRate, marketPosition]);
  const sorted = useMemo(() => {
    const timeValue = (value: string) => {
      const [hours, minutes] = value.split(":").map(Number);
      return (hours < 10 ? hours + 12 : hours) * 60 + minutes;
    };
    const items = [...filtered];
    if (sortBy === "time_asc") return items.sort((a, b) => timeValue(a.offTime) - timeValue(b.offTime));
    if (sortBy === "time_desc") return items.sort((a, b) => timeValue(b.offTime) - timeValue(a.offTime));
    if (sortBy === "odds_asc") return items.sort((a, b) => (a.bestOdds?.decimal ?? Infinity) - (b.bestOdds?.decimal ?? Infinity));
    if (sortBy === "odds_desc") return items.sort((a, b) => (b.bestOdds?.decimal ?? -1) - (a.bestOdds?.decimal ?? -1));
    if (sortBy === "sr_desc") return items.sort((a, b) => (b.jockey30Day?.strikeRate ?? -1) - (a.jockey30Day?.strikeRate ?? -1));
    if (sortBy === "sr_asc") return items.sort((a, b) => (a.jockey30Day?.strikeRate ?? Infinity) - (b.jockey30Day?.strikeRate ?? Infinity));
    return items;
  }, [filtered, sortBy]);
  const trackFilter = (filterName: string, value: string) => captureAnalytics("saddle_signals_filter_changed", { filter: filterName, value, day });
  const reset = () => {
    captureAnalytics("saddle_signals_filters_reset", { day, active_filters: activeCount });
    setCourse("all"); setFlag("all"); setRaceType("all"); setCourseDistance("all"); setLtoResult("all"); setJockey("all"); setJockeyStrikeRate("all"); setMarketPosition("all");
  };
  const changeDay = (next: DayKey) => { captureAnalytics("saddle_signals_day_changed", { from: day, to: next }); setDay(next); reset(); };

  return <main>
    <header className="masthead">
      <a className="brand" href="#top" aria-label="Track Strats Saddle Signals home"><img src={saddleSignalsLogo.src} alt="Track Strats Saddle Signals"/></a>
      <nav className="mainNav" aria-label="Main navigation"><span aria-current="page">Saddle Signals</span><a href="https://racescanner.trackstrats.com" target="_blank" rel="noreferrer">Race Scanner</a><a href="https://racecards.trackstrats.com" target="_blank" rel="noreferrer">Racecards</a><a href="https://trackstrats.com" target="_blank" rel="noreferrer">Shop</a>{!session.loading && (session.authenticated ? <a href="/auth/logout">Log out{session.customer?.firstName ? ` · ${session.customer.firstName}` : ""}</a> : <a href="/auth/login">Log in</a>)}</nav>
      <button className="mobileNavTrigger" type="button" aria-label="Open navigation" aria-expanded={mobileNavOpen} aria-controls="mobile-navigation" onClick={() => setMobileNavOpen(true)}><span className="mobileMenuIcon" aria-hidden="true"><i/><i/><i/></span></button>
      <div className={`mobileNavOverlay${mobileNavOpen ? " isOpen" : ""}`} aria-hidden={!mobileNavOpen} onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileNavOpen(false); }}>
        <aside className="mobileNavDrawer" id="mobile-navigation" aria-label="Mobile navigation">
          <div className="mobileNavHeading"><strong>Menu</strong><button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button></div>
          <nav><a href="https://racescanner.trackstrats.com" target="_blank" rel="noreferrer">Race Scanner<span aria-hidden="true">↗</span></a><a href="https://racecards.trackstrats.com" target="_blank" rel="noreferrer">Racecards<span aria-hidden="true">↗</span></a><a href="https://aheadofthemark.trackstrats.com" target="_blank" rel="noreferrer">Ahead Of The Mark<span aria-hidden="true">↗</span></a><a href="https://trackstrats.com" target="_blank" rel="noreferrer">Shop<span aria-hidden="true">↗</span></a>{!session.loading && (session.authenticated ? <a className="mobileAccountAction" href="/auth/logout">Log out{session.customer?.firstName ? ` · ${session.customer.firstName}` : ""}<span aria-hidden="true">↗</span></a> : <a className="mobileAccountAction" href="/auth/login">Log in<span aria-hidden="true">↗</span></a>)}</nav>
        </aside>
      </div>
    </header>
    <section className="hero" id="top"><div>
      <div className="daySwitch" role="tablist" aria-label="Choose race date">{(["today", "tomorrow"] as DayKey[]).map((item) => <button key={item} role="tab" aria-selected={day === item} onClick={() => changeDay(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
      <p className="eyebrow">{day.toUpperCase()}’S BOOKINGS · {current.races} RACES</p>
      <h1 className="scannerTitle"><span>Saddle</span> <em>Signals</em></h1>
      <p className="intro">Spot potentially significant jockey changes, from leading riders taking over to claimers brought in to reduce the weight.</p>
    </div><div className="heroStat"><strong>{current.runners}</strong><span>RUNNERS<br/>CHECKED {day.toUpperCase()}</span></div></section>
    <section className="filterShell">
      <div className="filterTop"><div><h2>Filters</h2><span className="countPill">{activeCount} active</span></div><button className="textBtn" onClick={reset}>Reset</button></div>
      <div className="filterBody"><div className="selectGrid">
        <label>Course<select value={course} onChange={(e) => { setCourse(e.target.value); trackFilter("course", e.target.value); }}><option value="all">All courses</option>{courses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Race type<select value={raceType} onChange={(e) => { setRaceType(e.target.value); trackFilter("race_type", e.target.value); }}><option value="all">All race types</option><option value="Flat">Flat</option><option value="Hurdle">Hurdle</option><option value="Chase">Chase</option><option value="NH Flat">NH Flat</option></select></label>
        <label>Signal<select value={flag} onChange={(e) => { setFlag(e.target.value); trackFilter("signal", e.target.value); }}><option value="all">All signals</option><option value="upgrade">Jockey upgrades</option><option value="claimer">New claimers</option></select></label>
        <label>Course / distance<select value={courseDistance} onChange={(e) => { setCourseDistance(e.target.value); trackFilter("course_distance", e.target.value); }}><option value="all">All records</option><option value="C">Course winner (C)</option><option value="D">Distance winner (D)</option><option value="CD">Course &amp; distance (CD)</option></select></label>
        <label>LTO result<select value={ltoResult} onChange={(e) => { setLtoResult(e.target.value); trackFilter("lto_result", e.target.value); }}><option value="all">All LTO results</option><option value="winner">LTO winner</option><option value="placed">LTO placed</option></select></label>
        <label>Jockeys<select value={jockey} onChange={(e) => { setJockey(e.target.value); trackFilter("jockey", e.target.value); }}><option value="all">All jockeys</option>{jockeys.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Jockey 30-day SR<select value={jockeyStrikeRate} onChange={(e) => { setJockeyStrikeRate(e.target.value); trackFilter("jockey_30_day_sr", e.target.value); }}><option value="all">All strike rates</option><option value="5">5%+</option><option value="10">10%+</option><option value="15">15%+</option><option value="20">20%+</option><option value="25">25%+</option></select></label>
        <label>Market position<select value={marketPosition} onChange={(e) => { setMarketPosition(e.target.value); trackFilter("market_position", e.target.value); }}><option value="all">All market positions</option><option value="favourite">Favourite</option><option value="top3">Top 3 in betting</option><option value="midfield">Midfield</option><option value="outsider">Outsider</option></select></label>
      </div></div>
    </section>
    <section className={`results${!session.loading && !session.authenticated ? " isLocked" : ""}`}><div className="resultsHead"><div><h2>Booking signals</h2><span className="resultCount">{sorted.length}</span></div><label className="sortControl">Sort by<select value={sortBy} onChange={(event) => { const value = event.target.value as SortKey; setSortBy(value); captureAnalytics("saddle_signals_sort_changed", { sort: value, day }); }}><option value="card">Racecard order</option><option value="time_asc">Time · earliest first</option><option value="time_desc">Time · latest first</option><option value="odds_asc">Odds · shortest first</option><option value="odds_desc">Odds · longest first</option><option value="sr_desc">Jockey SR · highest first</option><option value="sr_asc">Jockey SR · lowest first</option></select></label></div>
      {!session.loading && !session.authenticated && <div className="resultsGate"><section className="authDialog" aria-labelledby="login-title"><h2 id="login-title">See Your Signals</h2><p>Create your free Track Strats Toolkit account or log in to reveal today’s booking signals.</p><a className="authPrimary" href="/auth/login" onClick={() => captureAnalytics("saddle_signals_login_clicked", { location: "results_gate" })}>Log in or create an account</a></section></div>}
      {sorted.length ? <div className="cards">{sorted.map((item) => <AlertCard key={item.id} alert={item} day={day}/>)}</div> : <div className="empty"><strong>No qualifying booking changes.</strong><p>Try another day or reset the filters.</p><button onClick={reset}>Reset filters</button></div>}
    </section>
    <footer><strong>TRACK STRATS // RACING TOOLKIT</strong><span>Saddle Signals</span></footer>
  </main>;
}

function AlertCard({ alert, day }: { alert: Alert; day: DayKey }) {
  const raceId = alert.id.split("-")[0];
  const racecardUrl = `https://racecards.trackstrats.com/?day=${day}&race=${encodeURIComponent(raceId)}#racecard`;
  return <article className="runner">
    <div className="raceLine"><span>{alert.offTime}</span><strong>{alert.course}</strong><small>{alert.raceName} · {alert.distance}</small></div>
    <div className="runnerMain"><div className="number">{alert.horseNumber || "–"}</div><Silk alert={alert}/><div className="horse"><p>{alert.trainer}</p><h3><a href={racecardUrl} target="_blank" rel="noopener noreferrer" onClick={() => captureAnalytics("saddle_signals_racecard_opened", { day, race_id: raceId, course: alert.course, off_time: alert.offTime, signal: alert.flags.join(",") })} aria-label={`Open the ${alert.offTime} ${alert.course} racecard in a new tab`}>{alert.horse}</a></h3><span>{alert.raceType} · {alert.raceClass}</span></div>{alert.bestOdds && <div className="bestOdds" title={alert.bestOdds.isStartingPrice ? `Starting price: ${alert.bestOdds.fractional}` : `Best bookmaker price: ${alert.bestOdds.fractional} with ${alert.bestOdds.bookmaker}`}><small>{alert.bestOdds.isStartingPrice ? "SP" : "BEST ODDS"}</small><strong>{alert.bestOdds.fractional}</strong>{!alert.bestOdds.isStartingPrice && <span>{alert.bestOdds.bookmaker}</span>}</div>}</div>
    <div className="badges">{alert.flags.map((item) => <span className={item === "upgrade" ? "upgradeBadge" : "claimBadge"} key={item}>{labels[item as AlertFlag]}{item === "claimer" ? ` · ${alert.todayClaim}lb` : ""}</span>)}{alert.courseDistance && <span className="courseDistanceBadge" title={alert.courseDistance === "CD" ? "Previous course and distance winner" : alert.courseDistance === "C" ? "Previous course winner" : "Previous distance winner"}>{alert.courseDistance}</span>}</div>
    <div className="comparison"><div><small>LAST TIME OUT</small><strong>{alert.ltoJockey}</strong></div><i aria-hidden="true">→</i><div><small>TODAY</small><div className="jockeyLine"><strong>{alert.todayJockey}</strong><JockeyStat stats={alert.jockey30Day}/></div></div></div>
    <div className="cardFoot"><div><span>LTO finish</span><strong>{alert.ltoPosition || "–"}/{alert.ltoFieldSize || "–"}</strong></div><div className={alert.sameCourse ? "matchedCondition" : ""}><span>Course</span><strong>{alert.ltoCourse}</strong></div><div className={alert.sameDistance ? "matchedCondition" : ""}><span>Distance</span><strong>{alert.ltoDistance}</strong></div></div>
  </article>;
}

function Silk({ alert }: { alert: Alert }) {
  return alert.silkUrl
    ? <span className="silk liveSilk"><img src={alert.silkUrl} alt={`${alert.horse} racing silks`}/></span>
    : <span className="silk silkFallback" aria-label="Silks unavailable"/>;
}

function JockeyStat({ stats }: { stats: { wins: number; rides: number; strikeRate: number } | null }) {
  const [open, setOpen] = useState(false);
  if (!stats) return null;
  const rate = Number.isInteger(stats.strikeRate) ? stats.strikeRate.toFixed(0) : stats.strikeRate.toFixed(1);
  const detail = `${stats.wins} winners from ${stats.rides} rides`;
  return <button
    className={`jockeyStat${open ? " is-open" : ""}`}
    type="button"
    aria-expanded={open}
    aria-label={`${rate}% 30-day strike rate: ${detail}`}
    data-tooltip={detail}
    onClick={() => setOpen((current) => { if (!current) captureAnalytics("saddle_signals_jockey_stat_opened", { wins: stats.wins, rides: stats.rides, strike_rate: stats.strikeRate }); return !current; })}
    onBlur={() => setOpen(false)}
  >{rate}% 30-day SR</button>;
}
