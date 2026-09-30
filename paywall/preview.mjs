// Public presentation only. Paid runner data remains behind the server gate.
export const previewCss = `
html[data-tool-locked] .results> :not(.resultsHead):not(.tool-preview):not(.tool-preview-slot):not(.tool-preview-slot),
html[data-tool-locked] .pace-results> :not(.tool-preview):not(.tool-preview-slot):not(.tool-preview-slot),
html[data-tool-locked][data-tool-feature="market-movers"] .board> :not(.board-head):not(.tool-preview):not(.tool-preview-slot):not(.tool-preview-slot),
html[data-tool-locked] #results-shell> :not(.tool-preview):not(.tool-preview-slot):not(.tool-preview-slot){display:none!important}
html[data-tool-locked] .authBackdrop,html[data-tool-locked] .toolkit-auth-backdrop,
html[data-tool-locked] .feed-status.unavailable,html[data-tool-locked] .baseline,
html[data-tool-locked] .resultCount{display:none!important}
html[data-tool-locked] .results,html[data-tool-locked][data-tool-feature="market-movers"] .board{display:flex;flex-direction:column} html[data-tool-locked] .resultsHead,html[data-tool-locked] .board-head{order:-1} .tool-preview{position:relative;min-height:390px;isolation:isolate;width:100%;margin:16px 0}
.tool-preview-rows{filter:blur(7px);opacity:.55;pointer-events:none;user-select:none}
.tool-preview-row{background:white;border:1px solid #cfe4df;padding:22px;display:flex;align-items:center;gap:20px;min-height:108px;margin-bottom:12px}
.tool-preview-silk{width:42px;height:48px;background:#00b77b;clip-path:polygon(25% 0,40% 8%,60% 8%,75% 0,100% 28%,82% 43%,76% 32%,76% 100%,24% 100%,24% 32%,18% 43%,0 28%);flex:none}
.tool-preview-lines{flex:1}.tool-preview-lines i{display:block;background:#6b9d92;height:12px;width:55%;margin:12px 0}.tool-preview-lines i+ i{width:80%;height:8px;background:#bad9d1}
.tool-preview-price{background:#00d995;width:75px;height:45px}
.tool-preview-prompt{position:absolute;z-index:1;top:50%;left:50%;transform:translate(-50%,-50%);width:min(440px,calc(100% - 32px));box-sizing:border-box;text-align:center;background:white;border:1px solid #cfe4df;padding:28px;box-shadow:0 10px 35px #064c4012;color:#064c40}
.tool-preview-prompt h2{font-size:24px!important;line-height:1.2!important;letter-spacing:normal!important;text-transform:none!important;margin:0 0 12px!important}.tool-preview-prompt p{font-size:14px;line-height:1.5;margin:0 0 18px;color:#507d77}.tool-preview-prompt a{display:inline-block;background:#064c40;color:white;padding:13px 20px;text-decoration:none;font-size:13px;font-weight:800}.tool-preview-prompt small{display:block;margin-top:12px;color:#507d77;font-size:11px}
`;
export function previewScript(config, verifyUrl){return `(()=>{
const selector=${JSON.stringify(config.feature==='furthest-from-home'?'#results-shell':'.tool-preview-slot[data-ready]')};
let status=Number(document.documentElement.dataset.toolLocked||0);
function render(){
 if(!status)return;
 const host=document.querySelector(selector);if(!host||host.querySelector('.tool-preview'))return;
 const preview=document.createElement('div');preview.className='tool-preview';
 const rows=document.createElement('div');rows.className='tool-preview-rows';rows.setAttribute('aria-hidden','true');rows.inert=true;
 rows.innerHTML=Array.from({length:3},()=>'<div class="tool-preview-row"><span class="tool-preview-silk"></span><span class="tool-preview-lines"><i></i><i></i><i></i></span><span class="tool-preview-price"></span></div>').join('');
 const prompt=document.createElement('section');prompt.className='tool-preview-prompt';prompt.setAttribute('aria-label','Unlock selections');
 const heading=document.createElement('h2');heading.textContent=status===402?'Unlock your selections':status===401?'See your selections':'Check your access';
 const message=document.createElement('p');message.textContent=status===402?'Subscribe to Track Strats Toolkit to reveal the runners matching your filters.':status===401?'Log in or create an account to access your racing tools.':'Verify your subscription to reveal your selections.';
 const link=document.createElement('a');link.textContent=status===402?'View Toolkit subscription':status===401?'Log in or create an account':'Check my access';link.href=status===402?'https://trackstrats.com/products/track-strats-toolkit':${JSON.stringify(verifyUrl)};if(status===402){link.target='_blank';link.rel='noopener noreferrer';}
 const note=document.createElement('small');note.textContent='Runner preview - selections are hidden';
 prompt.append(heading,message,link,note);preview.append(rows,prompt);host.append(preview);
}
function lock(next){if(status!==next)document.querySelectorAll('.tool-preview').forEach(node=>node.remove());status=next;document.documentElement.dataset.toolLocked=String(status);render();}
const original=window.fetch.bind(window);window.fetch=async(...args)=>{const response=await original(...args);const target=new URL(args[0] instanceof Request?args[0].url:String(args[0]),location.href);if(target.origin===location.origin&&target.pathname===${JSON.stringify(config.api)}){if([401,402,503].includes(response.status)){const data=await response.clone().json().catch(()=>null);if(['login-required','subscription-required','verification-required'].includes(data?.code))lock(response.status);}else if(response.ok&&status){location.reload();}}return response;};
new MutationObserver(render).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',render);render();
})();`;}
