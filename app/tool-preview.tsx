'use client';
import {useEffect,useRef} from 'react';
// A stable, client-mounted slot for the staging gateway's public preview.
export default function ToolPreview(){const ref=useRef<HTMLDivElement>(null);useEffect(()=>{if(ref.current){ref.current.dataset.ready='true';ref.current.append(document.createComment('preview ready'));}},[]);return <div ref={ref} className="tool-preview-slot"/>;}
