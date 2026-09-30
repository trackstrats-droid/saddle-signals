import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {toolAccess} from './access.mjs';
import {previewCss,previewScript} from './preview.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(path.join(root,'paywall/config.json'),'utf8'));
const dashboard='https://toolkit.staging.trackstrats.com';
const environmentId='5c034589-c81b-4aa9-b4c7-cc1b1980c138';
export function assertStaging(env){
 if(env.APP_ENV!=='staging')throw Error('This server is only for paywall staging.');
 if(env.RAILWAY_ENVIRONMENT_ID&&env.RAILWAY_ENVIRONMENT_ID!==environmentId)throw Error('Refusing to run outside the isolated Railway environment.');
 for(const key of ['DATABASE_URL','RACING_API_USERNAME','RACING_API_PASSWORD','RACING_API_KEY','THERACINGAPI_USERNAME','THERACINGAPI_PASSWORD'])if(env[key])throw Error('Staging must not receive racing API or database credentials.');
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const verifyUrl=dashboard+'/verify-tool?tool='+encodeURIComponent(config.feature);
const secureHeaders={
 'Cache-Control':'private, no-store',Vary:'Cookie','X-Robots-Tag':'noindex, nofollow',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
 'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
};
const recoveryScript=previewScript(config,verifyUrl);
function stagingHtml(html,status=0){
 return html.replace('<html',status?`<html data-tool-feature="${config.feature}" data-tool-locked="${status}"`:'<html').replace('<head>',`<head><style>${previewCss}</style><script src="/_staging-access.js"></script>`);
}
const feedCache=new Map();
async function readFeed(url){
 const cached=feedCache.get(url);if(cached&&cached.until>Date.now())return cached.value;
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Stored feed unavailable');
 const text=await response.text();if(text.length>15000000)throw Error('Feed too large');const value=JSON.parse(text);
 if(feedCache.size>128)feedCache.clear();feedCache.set(url,{value,until:Date.now()+60000});return value;
}
async function dataFor(url){
 const day=url.searchParams.get('day')||'today';if(!['today','tomorrow'].includes(day))throw Error('Invalid day');
 const central='https://racing-data-api-production.up.railway.app/v1/public';
 if(config.feature==='pace-profiler')return (await readFeed(central+'/pace-profiles/'+day)).payload;
 if(config.feature==='saddle-signals'){
  const [today,tomorrow]=await Promise.all(['today','tomorrow'].map(d=>readFeed(central+'/saddle-signals/'+d)));
  return {generatedAt:today.date,watchlists:{flat:[],jumps:[]},today:today.payload,tomorrow:tomorrow.payload};
 }
 const target=new URL(config.api,'https://'+config.host+'.trackstrats.com');
 if(config.feature!=='market-movers')target.searchParams.set('day',day);
 if(config.feature==='furthest-from-home'){
  const course=url.searchParams.get('course');if(course&&course.length<=100)target.searchParams.set('course',course);
 }
 return readFeed(target.toString());
}
export async function run(){
 assertStaging(process.env);
 const port=Number(process.env.PORT||8080),innerPort=Number(process.env.STAGING_INNER_PORT||8091);
 if(port===innerPort)throw Error('Separate internal port required');
 let child;
 if(config.kind!=='static'){
  const args=config.kind==='next'?['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(innerPort)]:(config.host==='paceprofiler'?['dist/standalone/server.js']:['node_modules/vinext/dist/cli.js','start','--hostname','127.0.0.1','--port',String(innerPort)]);
  child=spawn(process.execPath,args,{cwd:root,env:{...process.env,PORT:String(innerPort),HOSTNAME:'127.0.0.1'},stdio:'inherit'});
  child.on('exit',code=>process.exit(code||1));
 }
 const server=http.createServer(async(req,res)=>{
  const send=(status,body,type='application/json')=>{res.writeHead(status,{...secureHeaders,'Content-Type':type});res.end(req.method==='HEAD'?undefined:body);};
  try{
   const url=new URL(req.url||'/','https://'+config.host+'.staging.trackstrats.com');
   if(!['GET','HEAD'].includes(req.method||''))return send(405,JSON.stringify({error:'Method not allowed'}));
   if(url.pathname==='/_staging-access.js')return send(200,recoveryScript,'text/javascript');
   if(url.pathname==='/health'){
    if(child){const healthy=await fetch('http://127.0.0.1:'+innerPort+'/',{signal:AbortSignal.timeout(3000)});if(!healthy.ok)throw Error('Frontend unavailable');}
    return send(200,JSON.stringify({status:'ok',environment:'staging',tool:config.feature}));
   }
   if(url.pathname==='/auth/login'){res.writeHead(302,{...secureHeaders,Location:verifyUrl});return res.end();}
   if(url.pathname==='/auth/logout'){res.writeHead(302,{...secureHeaders,Location:'https://login.staging.trackstrats.com/auth/logout?returnTo='+encodeURIComponent(dashboard+'/')});return res.end();}
   const cookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('track_strats_staging_identity='));
   if(url.pathname==='/api/auth/session'){
    if(cookie.length!==1||cookie[0].length>8300)return send(200,JSON.stringify({authenticated:false}));
    const session=await fetch(dashboard+'/api/auth/session',{headers:{Cookie:cookie[0]},redirect:'error',signal:AbortSignal.timeout(8000)});
    return send(session.status,await session.text());
   }
   const denied=await toolAccess(new Request(url,{headers:{Cookie:req.headers.cookie||''}}),config.feature);
   if(denied&&url.pathname.startsWith('/api/'))return send(denied.status,await denied.text());
   if(url.pathname===config.api)return send(200,JSON.stringify(await dataFor(url)));
   if(url.pathname.startsWith('/api/'))return send(404,JSON.stringify({error:'Not found'}));
   // Vinext's Cloudflare build needs its public client assets served separately.
   if(config.kind==='vinext'&&/\.(?:js|css|png|svg|ico|webp|jpg|woff2?)$/.test(url.pathname)){
    const base=path.join(root,'dist','client'),file=path.resolve(base,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(base+path.sep))return send(404,'Not found','text/plain');
    const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.jpg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2'}[path.extname(file)];
    try{return send(200,await readFile(file),mime);}catch{return send(404,'Not found','text/plain');}
   }
   if(config.kind==='static'){
    const file=path.resolve(root,'public',url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(path.join(root,'public')+path.sep))return send(404,'Not found','text/plain');
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'}[path.extname(file)]||'application/octet-stream';
    const body=await readFile(file);return send(200,mime.startsWith('text/html')?stagingHtml(body.toString(),denied?.status||0):body,mime);
   }
   const forwardedHeaders={};for(const key of ['accept','rsc','next-router-state-tree','next-router-prefetch','next-url'])if(req.headers[key])forwardedHeaders[key]=req.headers[key];
   const inner=await fetch('http://127.0.0.1:'+innerPort+url.pathname+url.search,{headers:forwardedHeaders,redirect:'manual',signal:AbortSignal.timeout(30000)});
   // No live cookie, credentials or authorization is forwarded to the frontend.
   if(inner.status>=300&&inner.status<400)return send(502,'Unexpected frontend redirect','text/plain');
   const mime=inner.headers.get('content-type')||'application/octet-stream',body=Buffer.from(await inner.arrayBuffer());
   return send(inner.status,mime.startsWith('text/html')?stagingHtml(body.toString(),denied?.status||0):body,mime);
  }catch{return send(503,JSON.stringify({error:'Staging data is temporarily unavailable. Please try again.'}));}
 });
 server.listen(port,'0.0.0.0',()=>console.log('Isolated staging tool ready:',config.feature));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{child?.kill(signal);server.close(()=>process.exit(0));});
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
