import { NextResponse } from "next/server";

const DEFAULT_URL = "https://racing-data-api-production.up.railway.app";

export async function GET() {
  const configuredUrl = process.env.RACING_DATA_API_URL || DEFAULT_URL;
  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    return NextResponse.json({ error: "Data service configuration is invalid" }, { status: 500 });
  }
  if (baseUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Data service configuration is invalid" }, { status: 500 });
  }
  const signal = AbortSignal.timeout(8_000);
  let todayResponse: Response;
  let tomorrowResponse: Response;
  try {
    [todayResponse, tomorrowResponse] = await Promise.all([
      fetch(new URL("/v1/public/saddle-signals/today", baseUrl), { signal, next: { revalidate: 120 } }),
      fetch(new URL("/v1/public/saddle-signals/tomorrow", baseUrl), { signal, next: { revalidate: 1800 } }),
    ]);
  } catch {
    return NextResponse.json({ error: "Racing snapshots are temporarily unavailable" }, { status: 503 });
  }
  if (!todayResponse.ok || !tomorrowResponse.ok) {
    return NextResponse.json({ error: "Racing snapshots are not available yet" }, { status: 503 });
  }
  const [today, tomorrow] = await Promise.all([todayResponse.json(), tomorrowResponse.json()]);
  if (!today?.payload?.flags || !tomorrow?.payload?.flags) {
    return NextResponse.json({ error: "Racing snapshot format is invalid" }, { status: 502 });
  }
  return NextResponse.json({
    generatedAt: today.date,
    watchlists: { flat: [], jumps: [] },
    today: today.payload,
    tomorrow: tomorrow.payload,
  }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
