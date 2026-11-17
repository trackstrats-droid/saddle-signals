import assert from 'node:assert/strict';
import test from 'node:test';
import {dashboardAngles} from '../app/lib/dashboard-angles.ts';

const filters={course:'All courses',raceType:'All race types',signal:'Jockey upgrades',courseForm:'All records',ltoResult:'All LTO results',jockey:'All jockeys',jockeySr:'20%+',marketPosition:'Top 3 in betting',sort:'Jockey SR · highest first'};

test('saves a Saddle Signals angle through the authenticated dashboard bridge',async()=>{
 const calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url,init});
  if(!init.body)return Response.json({profile:'profile-1',revision:7,widgets:[]});
  return Response.json({saved:true});
 };
 const request=new Request('http://localhost:3000/api/angles',{method:'POST',headers:{origin:'http://localhost:3000',cookie:'track_strats_identity=signed-user','content-type':'application/json'},body:JSON.stringify({profile:'profile-1',name:'Leading jockeys',comment:'Watch these',colour:'teal',filters})});
 const response=await dashboardAngles(request,fetcher);
 assert.equal(response.status,200);
 assert.equal(calls.length,2);
 assert.equal(calls[0].init.headers.Cookie,'track_strats_identity=signed-user');
 const update=JSON.parse(calls[1].init.body);
 const angle=update.widgets[0];
 assert.equal(angle.source,'Saddle Signals');
 assert.equal(angle.name,'Leading jockeys');
 assert.deepEqual(angle.filters,filters);
});

test('rejects cross-origin angle saves',async()=>{
 const request=new Request('http://localhost:3000/api/angles',{method:'POST',headers:{origin:'https://example.com',cookie:'track_strats_identity=signed-user','content-type':'application/json'},body:'{}'});
 const response=await dashboardAngles(request,async()=>{throw new Error('must not call dashboard');});
 assert.equal(response.status,403);
 assert.deepEqual(await response.json(),{error:'Invalid request origin.'});
});
