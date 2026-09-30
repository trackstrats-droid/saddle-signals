import {toolAccess} from '../../../paywall/access.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return await toolAccess(request,'saddle-signals',{allowService:false})||Response.json({allowed:true},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});}
