"use client";
import {useEffect,useRef} from 'react';
export default function ToolPreview(){const ref=useRef<HTMLDivElement>(null);useEffect(()=>{if(ref.current){ref.current.dataset.ready='true';ref.current.append(document.createComment('preview ready'));}if(!document.getElementById('tool-access-preview')){const script=document.createElement('script');script.id='tool-access-preview';script.src='/api/tool-preview';document.head.append(script);}},[]);return <div ref={ref} className="tool-preview-slot"/>;}
