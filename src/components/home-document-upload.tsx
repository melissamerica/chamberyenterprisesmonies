'use client';
import {useEffect,useRef,useState} from 'react';
import {CloudUpload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {automaticUploadAccept} from '@/lib/automatic-upload';

type ExecutiveOption={id:string;name:string};
export function HomeDocumentUpload({executives,disabled,onStart,onCreateExecutive}:{executives:ExecutiveOption[];disabled:boolean;onStart:(executiveId:string,files:File[])=>void;onCreateExecutive:()=>void}) {
  const [executiveId,setExecutiveId]=useState(''),[pending,setPending]=useState<File[]>([]),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
  const input=useRef<HTMLInputElement>(null),initialized=useRef(false);
  useEffect(()=>{if(!initialized.current&&executives.length){initialized.current=true;if(executives.length===1)setExecutiveId(executives[0].id);}},[executives]);
  function receive(files:FileList|File[]) {
    setDragging(false);setError('');
    if(disabled)return;
    if(!executives.length){setError('Create an executive first, then upload the document.');return;}
    const batch=Array.from(files);if(!batch.length)return;
    if(!executives.some(value=>value.id===executiveId)){setPending(batch);setError('Choose the executive for these documents, then continue.');return;}
    setPending([]);onStart(executiveId,batch);
  }
  return <section className={`home-document-upload${dragging?' dragging':''}`} aria-label="Home document upload" onDragOver={event=>{event.preventDefault();if(!disabled)setDragging(true);}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false);}} onDrop={event=>{event.preventDefault();receive(event.dataTransfer.files);}}>
    <div className="flex items-center gap-2"><CloudUpload className="size-5 text-[#684576]"/><h2 className="font-semibold">Upload documents</h2></div>
    <label htmlFor="home-upload-executive" className="mt-3 block text-xs font-medium text-slate-600">For executive</label>
    <select id="home-upload-executive" className="simple-select mt-1 w-full" value={executiveId} disabled={disabled||!executives.length} onChange={event=>{setExecutiveId(event.target.value);setError('');}}><option value="">Select executive</option>{executives.map(value=><option key={value.id} value={value.id}>{value.name}</option>)}</select>
    <button type="button" className="home-document-drop" disabled={disabled||!executives.length} onClick={()=>input.current?.click()}><CloudUpload className="size-5"/><span><strong>Drop files here</strong><small>or choose files · Up to 20 MB each</small></span></button>
    <input ref={input} className="hidden" type="file" multiple accept={automaticUploadAccept} aria-label="Choose documents from Home" disabled={disabled||!executives.length} onChange={event=>{if(event.target.files)receive(event.target.files);event.target.value='';}}/>
    <p className="mt-2 text-xs leading-5 text-slate-500">Document type recognized automatically. Review the trip before anything is added.</p>
    {!executives.length&&<Button type="button" variant="outline" size="sm" className="mt-2" disabled={disabled} onClick={onCreateExecutive}>Create executive to start</Button>}
    {!!pending.length&&<div className="mt-3 space-y-2 text-sm"><p>{pending.length===1?pending[0].name:`${pending.length} documents ready`}</p><div className="flex gap-2"><Button type="button" size="sm" disabled={disabled||!executives.some(e=>e.id===executiveId)} onClick={()=>receive(pending)}>Continue upload</Button><Button type="button" size="sm" variant="ghost" onClick={()=>{setPending([]);setError('');}}>Cancel</Button></div></div>}
    {error&&<p role="alert" className="mt-2 text-sm text-amber-800">{error}</p>}
  </section>;
}
