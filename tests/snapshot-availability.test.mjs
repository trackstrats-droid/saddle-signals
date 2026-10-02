import test from 'node:test';
import assert from 'node:assert/strict';
import { combineSnapshots } from '../app/api/racing-data/snapshots.mjs';
const available = () => Response.json({date:'2026-10-03',payload:{flags:[{id:'test-runner'}],races:1}});
const missing = () => Response.json({detail:'Not found'},{status:404});
test('missing tomorrow does not hide available today', async () => {
  const result = await combineSnapshots(available(),missing());
  assert.equal(result.status,200);
  assert.equal(result.body.today.flags.length,1);
  assert.equal(result.body.tomorrow.snapshotAvailable,false);
  assert.deepEqual(result.body.tomorrow.flags,[]);
});
test('missing today is explicit and does not hide tomorrow', async () => {
  const result = await combineSnapshots(missing(),available());
  assert.equal(result.body.today.snapshotAvailable,false);
  assert.equal(result.body.tomorrow.flags.length,1);
});
test('authentication and upstream errors are not reported as empty days', async () => {
  for (const status of [401,403,500,503]) {
    assert.equal((await combineSnapshots(available(),new Response('',{status}))).status,503);
  }
});
test('malformed data remains an error', async () => {
  assert.equal((await combineSnapshots(available(),Response.json({payload:{}}))).status,502);
});
