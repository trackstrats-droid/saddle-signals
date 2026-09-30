import {timingSafeEqual} from 'node:crypto';
const features=new Set(['ahead-of-the-mark','race-scanner','saddle-signals','pace-profiler','market-movers','furthest-from-home']);
const paths=new Set(['/api/shortlist','/api/racecards','/api/racing-data','/api/cards','/api/movers','/api/dashboard']);
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function toolAccess(request,feature,{fetcher=fetch,mode=process.env.PAYWALL_MODE||'off',allowService=true}={}){
 const deny=(status,reason)=>Response.json({code:reason,error:status===401?'Log in to use this tool.':status===402?'You need a valid Track Strats Toolkit subscription to use this tool':'Please verify your subscription.'},{status,headers});
 if(!features.has(feature)||!['off','shadow','enforce'].includes(mode))return deny(503,'verification-required');
 if(mode!=='enforce')return null;
 // Internal callers may read existing feeds, but may never grant customer access.
 const configured=process.env.TOOLKIT_FEED_TOKEN,supplied=request.headers.get('X-Track-Strats-Feed-Key');
 if(allowService&&paths.has(new URL(request.url).pathname)&&configured&&configured.length>=32&&supplied&&supplied.length<=512){const a=Buffer.from(configured),b=Buffer.from(supplied);if(a.length===b.length&&timingSafeEqual(a,b))return null;}
 const cookies=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('track_strats_identity='));
 if(cookies.length!==1||cookies[0].length>8300)return deny(401,'login-required');
 try{
  const response=await fetcher('https://toolkit.trackstrats.com/api/access?feature='+encodeURIComponent(feature),{headers:{Cookie:cookies[0]},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});
  const value=await response.json();if(response.status===200&&value.allowed===true&&value.reason==='subscriber')return null;
  return deny(response.status===401?401:response.status===402?402:503,response.status===401?'login-required':response.status===402?'subscription-required':'verification-required');
 }catch{return deny(503,'verification-required');}
}
