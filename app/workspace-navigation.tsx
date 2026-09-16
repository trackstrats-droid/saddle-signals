"use client";
import {useEffect,useRef,useState} from 'react';
import MobileNavigation from './workspace-mobile-navigation';
import {captureAnalytics as trackNavigation} from './analytics';
const tools=[['Racecards','racecards'],['Race Scanner','racescanner'],['Market Movers','marketmovers'],['Ahead Of The Mark','aheadofthemark'],['Furthest From Home','furthestfromhome'],['Saddle Signals','saddlesignals'],['Pace Profiler','paceprofiler']];
export default function DesktopNavigation(){
 const [open,setOpen]=useState(false),[signed,setSigned]=useState(false);
 const root=useRef<HTMLDivElement>(null),toggle=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;const refresh=()=>fetch('/api/auth/session',{credentials:'include',cache:'no-store'}).then(r=>r.ok?r.json():null).then(s=>{if(active)setSigned(s?.authenticated===true)}).catch(()=>{});void refresh();window.addEventListener('focus',refresh);const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('pointerdown',outside)}},[]);
 const record=(destination:string)=>trackNavigation('saddle_signals_navigation_clicked',{destination,location:'header'});
 return <><MobileNavigation signed={signed} tools={tools}/><nav className="ts-desktop-tool-navigation" aria-label="Workspace navigation">
  <a className="ts-current-tool" href="#" aria-current="page">Saddle Signals</a>
  <a href="https://toolkit.trackstrats.com/" target="_blank" rel="noopener noreferrer" onClick={()=>record('Dashboard')}>Dashboard</a>
  <div className="ts-toolkit-navigation" ref={root} onMouseEnter={()=>{if(matchMedia('(hover: hover)').matches)setOpen(true)}} onMouseLeave={()=>{if(matchMedia('(hover: hover)').matches)setOpen(false)}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);toggle.current?.focus()}}}>
   <div className="ts-toolkit-navigation-trigger"><a href="https://toolkit.trackstrats.com/?page=toolkit" target="_blank" rel="noopener noreferrer" onClick={()=>record('Toolkit')}>Toolkit</a><button ref={toggle} type="button" aria-label="Show toolkit tools" aria-expanded={open} aria-controls="ts-toolkit-navigation-list" onClick={()=>setOpen(!open)}><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg></button></div>
   <div id="ts-toolkit-navigation-list" className="ts-toolkit-navigation-list" hidden={!open}>{tools.map(([name,slug])=><a key={slug} href={`https://${slug}.trackstrats.com/`} target="_blank" rel="noopener noreferrer" onClick={()=>{record(name);setOpen(false)}}>{name}</a>)}</div>
  </div>
  <a href="https://toolkit.trackstrats.com/?page=my-angles" target="_blank" rel="noopener noreferrer" onClick={()=>record('My Angles')}>My Angles</a>
  <a href="https://trackstrats.com" target="_blank" rel="noopener noreferrer" onClick={()=>record('Shop')}>Shop</a>
  <a className="ts-navigation-account" href={`/auth/${signed?'logout':'login'}?returnTo=https%3A%2F%2Fsaddlesignals.trackstrats.com%2F`} onClick={e=>{e.preventDefault();const url=new URL(e.currentTarget.href,window.location.origin);url.searchParams.set('returnTo',window.location.href);window.location.assign(url.toString())}}>{signed?'Log out':'Log in'}</a>
 </nav></>;
}
