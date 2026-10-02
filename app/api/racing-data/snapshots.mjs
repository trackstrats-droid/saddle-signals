export async function combineSnapshots(todayResponse, tomorrowResponse) {
  const responses = [todayResponse, tomorrowResponse];
  if (responses.some(response => !response.ok && response.status !== 404)) {
    return { status: 503, body: { error: 'Racing snapshots are temporarily unavailable' } };
  }
  const snapshots = await Promise.all(responses.map(async response => {
    if (response.status === 404) return null;
    return response.json();
  }));
  if (snapshots.some(snapshot => snapshot && !Array.isArray(snapshot.payload?.flags))) {
    return { status: 502, body: { error: 'Racing snapshot format is invalid' } };
  }
  const empty = () => ({ races: 0, runners: 0, courses: [], flags: [], snapshotAvailable: false });
  return { status: 200, body: {
    generatedAt: snapshots[0]?.date || '',
    watchlists: { flat: [], jumps: [] },
    today: snapshots[0] ? { ...snapshots[0].payload, snapshotAvailable: true } : empty(),
    tomorrow: snapshots[1] ? { ...snapshots[1].payload, snapshotAvailable: true } : empty(),
  } };
}
