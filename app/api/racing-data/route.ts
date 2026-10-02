import {toolAccess} from "../../../paywall/access.mjs";
import { NextResponse } from "next/server";
import { combineSnapshots } from './snapshots.mjs';

const DEFAULT_URL = "https://racing-data-api-production.up.railway.app";

export async function GET(request: Request) {
  const denied=await toolAccess(request,"saddle-signals");if(denied)return denied;
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
      fetch(new URL("/v1/public/saddle-signals/today", baseUrl), { signal, redirect:'error', headers:{'X-Track-Strats-Key':process.env.DATA_SERVICE_TOKEN||''}, next: { revalidate: 120 } }),
      fetch(new URL("/v1/public/saddle-signals/tomorrow", baseUrl), { signal, redirect:'error', headers:{'X-Track-Strats-Key':process.env.DATA_SERVICE_TOKEN||''}, next: { revalidate: 1800 } }),
    ]);
  } catch {
    return NextResponse.json({ error: "Racing snapshots are temporarily unavailable" }, { status: 503 });
  }
  const result = await combineSnapshots(todayResponse, tomorrowResponse);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "private, no-store", "Vary":"Cookie" } });
}
