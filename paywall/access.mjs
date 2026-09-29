// Staging-only server gate. Forward only the signed staging identity to its issuer.
export async function toolAccess(request,feature,{fetcher=fetch,environment=process.env.APP_ENV}={}){
 if(environment!=='staging')return null;
 const h={'Cache-Control':'private, no-store','Vary':'Cookie'};
 const deny=(status,code)=>Response.json({error:status===401?'Log in to use this tool.':status===402?'A Toolkit subscription is required.':'Please verify your subscription on the staging dashboard.',code,accessUrl:'https://toolkit.staging.trackstrats.com/'},{status,headers:h});
 const cookie=request.headers.get('cookie')||'';
 const parts=cookie.split(';').map(v=>v.trim()).filter(v=>v.startsWith('track_strats_staging_identity='));
 if(parts.length!==1||parts[0].length>8300)return deny(401,'login-required');
 try{
  const endpoint=new URL('https://toolkit.staging.trackstrats.com/api/access');endpoint.searchParams.set('feature',feature);
  const response=await fetcher(endpoint,{headers:{Cookie:parts[0]},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  const data=await response.json();if(response.status===200&&data.allowed===true&&data.reason==='subscriber')return null;
  return deny([401,402].includes(response.status)?response.status:503,typeof data.reason==='string'?data.reason:'verification-required');
 }catch{return deny(503,'verification-required');}
}
