import {dashboardAngles} from '../../lib/dashboard-angles';

export const dynamic='force-dynamic';
export async function GET(request:Request){return dashboardAngles(request);}
export async function POST(request:Request){return dashboardAngles(request);}
