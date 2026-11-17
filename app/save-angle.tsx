"use client";
import {useEffect,useRef,useState} from 'react';
import {angleColours,filterLabels} from './save-angle-model';

type Filters=Record<string,string|string[]|boolean>;

export default function SaveAngle({filters,defaultName}:{filters:Filters;defaultName:string}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [snapshot,setSnapshot]=useState<Filters|null>(null),[name,setName]=useState(''),[comment,setComment]=useState(''),[colour,setColour]=useState('teal');
 const [profile,setProfile]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(0),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 useEffect(()=>{if(!snapshot)return;dialog.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';const controller=new AbortController();
 void fetch('/api/angles',{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok){setStatus(response.status);throw Error(data.error);}setProfile(data.profile);}).catch(e=>{if(e.name!=='AbortError')setError(e.message||'Unable to connect to your dashboard.');});
 return()=>{controller.abort();document.body.style.overflow=previous;};},[snapshot]);
 function close(){if(busy)return;dialog.current?.close();setSnapshot(null);trigger.current?.focus();}
 function open(){setName(defaultName);setComment('');setColour('teal');setProfile('');setError('');setStatus(0);setSaved(false);setSnapshot(structuredClone(filters));}
 async function save(event:React.FormEvent){event.preventDefault();if(!profile||busy||saved)return;setBusy(true);setError('');
  try{const response=await fetch('/api/angles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,name,comment,colour,filters:snapshot})});const data=await response.json();if(!response.ok){setStatus(response.status);throw Error(data.error);}setSaved(true);}catch(e){setError(e instanceof Error?e.message:'Unable to save your angle.');}finally{setBusy(false);}
 }
 return <><button type="button" className="textBtn" ref={trigger} onClick={open}>Save angle</button>{snapshot&&<dialog ref={dialog} className="saveAngleDialog" aria-labelledby="save-angle-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
 <button className="saveAngleClose" type="button" aria-label="Close save angle" disabled={busy} onClick={close}>×</button>
 <h2 id="save-angle-title">{saved?'Your angle is saved':'Save your angle'}</h2>
 {saved?<><p role="status">Your Saddle Signals conditions are now saved to your dashboard.</p><a className="saveAnglePrimary" href="https://toolkit.trackstrats.com/?page=my-angles">View your saved angles</a></>:<><p>Save these conditions to your dashboard. Find matching runners for Today or Tomorrow from your saved angle.</p>
 <form onSubmit={save}><label className="saveAngleField">Angle name<input autoFocus required maxLength={65} placeholder="e.g. Leading jockey upgrades" value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
 <label className="saveAngleField">Comment <span>(optional)</span><textarea rows={3} maxLength={1000} placeholder="Why this angle is worth watching…" value={comment} onChange={e=>setComment(e.target.value)} disabled={busy}/></label>
 <fieldset className="saveAngleColours" disabled={busy}><legend>Colour</legend><div>{angleColours.map(([id,label,hex])=><label key={id} style={{'--angle-colour':hex} as React.CSSProperties}><input type="radio" name="angle-colour" value={id} checked={colour===id} onChange={()=>setColour(id)}/><span><i/>{label}</span></label>)}</div></fieldset>
 <section className="saveAngleConditions"><h3>Selected conditions</h3><dl>{Object.entries(snapshot).map(([key,value])=><div key={key}><dt>{filterLabels[key]||key}</dt><dd>{Array.isArray(value)?value.join(', ')||'All':typeof value==='boolean'?'Yes':value}</dd></div>)}</dl><p>Matches follow the Today / Tomorrow selection on your dashboard.</p></section>
 {error&&<p className="saveAngleError" role="alert">{error}</p>}
 {status===401&&<p><a href="/auth/login">Log in to your account</a></p>}{status===402&&<p><a href="https://trackstrats.com/products/track-strats-toolkit">View Toolkit subscription</a></p>}
 <button type="submit" className="saveAnglePrimary" disabled={!profile||busy||status===401||status===402}>{busy?'Saving…':!profile&&!error?'Connecting to dashboard…':'Save to dashboard'}</button></form><p><a href="https://toolkit.trackstrats.com/?page=my-angles">Manage your saved angles</a></p></>}
 </dialog>}</>;
}
