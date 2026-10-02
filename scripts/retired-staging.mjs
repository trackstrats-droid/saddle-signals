import http from 'node:http';
if(process.env.APP_ENV !== 'staging' || process.env.RAILWAY_ENVIRONMENT_ID !== '5c034589-c81b-4aa9-b4c7-cc1b1980c138') throw Error('Staging only');
const destination = "https://saddlesignals.trackstrats.com/";
http.createServer((req,res)=>{
 const pathname = new URL(req.url || '/', 'https://staging.trackstrats.com').pathname;
 const health = pathname === '/health' || pathname === '/api/health';
 const api = pathname.startsWith('/api/');
 res.writeHead(health ? 200 : api ? 410 : 200, {'Content-Type':health || api ? 'application/json' : 'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"});
 res.end(req.method==='HEAD' ? undefined : health ? JSON.stringify({status:'ok',environment:'staging',retired:true}) : api ? JSON.stringify({error:'This temporary test environment has been retired.'}) : `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Track Strats test environment</title><style>body{font:18px system-ui;background:#eff8f5;color:#073f33;margin:0;padding:10vh 24px}main{max-width:640px;margin:auto;padding:32px;background:white;border:1px solid #d5e8e2}a{color:#007f58}</style><main><h1>Testing is complete</h1><p>This temporary paywall test environment has been retired. Please use the live Track Strats site.</p><p><a href="${destination}">Open the live site</a></p></main></html>`);
}).listen(Number(process.env.PORT || 8080),'0.0.0.0');
