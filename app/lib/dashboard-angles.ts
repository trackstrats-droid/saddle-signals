import {randomInt} from 'node:crypto';

const origin='https://toolkit.trackstrats.com';

export function validAngleOrigin(request:Request){
 const expected=process.env.NODE_ENV==='production'?'https://saddlesignals.trackstrats.com':new URL(request.url).origin;
 return request.headers.get('origin')===expected;
}

class Failure extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}

export async function dashboardAngles(request:Request,fetcher:typeof fetch=fetch){
 const headers={'Cache-Control':'private, no-store'};
 try{
  if(request.method==='POST'&&!validAngleOrigin(request))throw new Failure(403,'Invalid request origin.');
  const cookie=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('track_strats_identity=')).join(';');
  if(!cookie||cookie.length>8192)throw new Failure(401,'Log in to save angles to your dashboard.');
  const call=async(body?:unknown)=>{
   const response=await fetcher(origin+'/api/widgets',{method:body?'PUT':'GET',headers:{Cookie:cookie,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});
   const data=await response.json();
   if(!response.ok)throw new Failure([400,401,402,409,429].includes(response.status)?response.status:503,response.status===402?'A Toolkit subscription is required to save angles.':response.status===401?'Please log in again.':response.status===409?'Your dashboard changed in another tab. Please try again.':response.status===400?'These angle settings could not be saved.':response.status===429?'Please wait a moment before saving again.':'Dashboard temporarily unavailable. Please try again.');
   return data;
  };
  let input:unknown;
  if(request.method==='POST'){
   const reader=request.body?.getReader();if(!reader)throw new Failure(400,'Invalid angle.');let raw='',size=0;const decoder=new TextDecoder();
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();throw new Failure(413,'Angle is too large.');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
   try{input=JSON.parse(raw);}catch{throw new Failure(400,'Invalid angle.');}
   const candidate=input as {name?:unknown;comment?:unknown;colour?:unknown;filters?:unknown;profile?:unknown};
   if(typeof candidate.name!=='string'||!candidate.name.trim()||candidate.name.length>65||typeof candidate.comment!=='string'||candidate.comment.length>1000||typeof candidate.colour!=='string'||!['teal','blue','purple','amber','rose','slate','olive','coral'].includes(candidate.colour)||!candidate.filters||typeof candidate.filters!=='object'||Array.isArray(candidate.filters))throw new Failure(400,'Enter a name and valid angle settings.');
  }
  const current=await call();
  if(typeof current.profile!=='string'||!Array.isArray(current.widgets)||!Number.isSafeInteger(current.revision))throw new Failure(503,'Dashboard temporarily unavailable.');
  if(request.method==='GET')return Response.json({profile:current.profile},{headers});
  const candidate=input as {name:string;comment:string;colour:string;filters:Record<string,unknown>;profile:string};
  if(candidate.profile!==current.profile)throw new Failure(409,'Your signed-in account changed. Close this window and try again.');
  if(current.widgets.length>=50)throw new Failure(400,'You can save up to 50 angles. Manage your saved angles in the dashboard.');
  let id;do{id=randomInt(1,2**48-1);}while(current.widgets.some((widget:{id:number})=>widget.id===id));
  await call({profile:current.profile,revision:current.revision,widgets:[...current.widgets,{id,name:candidate.name.trim(),comment:candidate.comment.trim(),colour:candidate.colour,source:'Saddle Signals',visible:true,filters:candidate.filters}]});
  return Response.json({saved:true,id},{headers});
 }catch(error){return Response.json({error:error instanceof Failure?error.message:'Dashboard temporarily unavailable. Please try again.'},{status:error instanceof Failure?error.status:503,headers});}
}
