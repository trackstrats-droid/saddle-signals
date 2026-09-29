"use client";
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {captureAnalytics as trackNavigation} from './analytics';
export default function MobileNavigation({signed,tools}:{signed:boolean;tools:string[][]}){
 const [mounted,setMounted]=useState(false),[open,setOpen]=useState(false),[expanded,setExpanded]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null),drawer=useRef<HTMLElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const close=()=>{setOpen(false);trigger.current?.focus()};
 useEffect(()=>{setMounted(true)},[]);
 useEffect(()=>{if(!open)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';closeButton.current?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const items=Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button')||[]).filter(el=>el.getClientRects().length);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};
  const desktop=matchMedia('(min-width:1200px), (min-width:900px) and (orientation:landscape)');const resize=()=>{if(desktop.matches)setOpen(false)};desktop.addEventListener('change',resize);document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);desktop.removeEventListener('change',resize)};
 },[open]);
 const record=(destination:string)=>{trackNavigation('saddle_signals_navigation_clicked',{destination,location:'mobile_header'});close()};
 return <><button ref={trigger} className="ts-mobile-nav-trigger" type="button" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={()=>{setExpanded(false);setOpen(true)}}><span className="ts-mobile-menu-icon" aria-hidden="true"><i/><i/><i/></span></button>
 {mounted&&createPortal(<div className={`ts-mobile-nav-overlay${open?' is-open':''}`} aria-hidden={!open} inert={!open} onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><aside ref={drawer} className="ts-mobile-nav-drawer" id="mobile-navigation" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-heading"><div className="ts-mobile-nav-heading"><strong id="mobile-menu-heading">Menu</strong><button ref={closeButton} type="button" aria-label="Close navigation" onClick={close}>×</button></div><nav aria-label="Mobile navigation">
 <a href="https://toolkit.staging.trackstrats.com/" target="_blank" rel="noopener noreferrer" onClick={()=>record('Dashboard')}>Dashboard</a>
 <div className="ts-mobile-toolkit-row"><a href="https://toolkit.staging.trackstrats.com/?page=toolkit" target="_blank" rel="noopener noreferrer" onClick={()=>record('Toolkit')}>Toolkit</a><button type="button" aria-label="Show toolkit tools" aria-expanded={expanded} aria-controls="ts-mobile-toolkit-list" onClick={()=>setExpanded(!expanded)}><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg></button></div>
 <div id="ts-mobile-toolkit-list" className="ts-mobile-toolkit-list" hidden={!expanded}>{tools.map(([name,slug])=><a key={slug} href={`https://${slug}${slug==='racecards'?'':'.staging'}.trackstrats.com/`} target="_blank" rel="noopener noreferrer" onClick={()=>record(name)}>{name}</a>)}</div>
 <a href="https://toolkit.staging.trackstrats.com/?page=my-angles" target="_blank" rel="noopener noreferrer" onClick={()=>record('My Angles')}>My Angles</a>
 <a href="https://trackstrats.com" target="_blank" rel="noopener noreferrer" onClick={()=>record('Shop')}>Shop</a>
 <a className="ts-mobile-account-action" href={`/auth/${signed?'logout':'login'}?returnTo=https%3A%2F%2Fsaddlesignals.trackstrats.com%2F`} onClick={e=>{e.preventDefault();const url=new URL(e.currentTarget.href,window.location.origin);url.searchParams.set('returnTo',window.location.href);record(signed?'Log out':'Log in');window.location.assign(url.toString())}}>{signed?'Log out':'Log in'}<span className="ts-mobile-account-lock" aria-hidden="true">{signed?'🔒':'🔓'}</span></a>
 </nav></aside></div>,document.body)}</>;
}
