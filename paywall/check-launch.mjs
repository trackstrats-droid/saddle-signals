export function checkLaunch(env){
 const mode=env.PAYWALL_MODE||'off';
 if(!['off','shadow','enforce'].includes(mode))throw Error('Invalid PAYWALL_MODE');
 if(mode==='off')return;
 if(env.APP_ENV!=='production')throw Error('Launch branch requires APP_ENV=production');
 if(env.RAILWAY_ENVIRONMENT_NAME==='paywall-staging')throw Error('Use the staging branch in staging');
 if(!env.TOOLKIT_FEED_TOKEN||env.TOOLKIT_FEED_TOKEN.length<32)throw Error('TOOLKIT_FEED_TOKEN must be configured');
}
checkLaunch(process.env);
