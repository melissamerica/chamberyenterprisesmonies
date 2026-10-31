'use client';

import { useEffect, useRef, useState } from 'react';
import { CloudUpload, Loader2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { analyzeTemplateReference, referencePreview, renderReferenceFields, clockFormats, type VisualReference } from '@/lib/visual-template';
import { calendarTemplatePreview, templateFields, type CalendarFormat, type ExecutiveTemplates, type TemplateKind } from '@/lib/executive-profiles';
import { readTravelDocument } from '@/lib/travel-confirmations';

export function VisualTemplateImport({templates,disabled,onApply,initialOpen=false}:{templates:ExecutiveTemplates;disabled:boolean;initialOpen?:boolean;onApply:(change:Partial<ExecutiveTemplates>,kind:TemplateKind,example:ReturnType<typeof referencePreview>|null)=>void}) {
  const [open,setOpen]=useState(initialOpen),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [reference,setReference]=useState<VisualReference|null>(null),[text,setText]=useState(''),[filename,setFilename]=useState(''),[image,setImage]=useState('');
  const input=useRef<HTMLInputElement>(null),reading=useRef(false),active=useRef(true),imageRef=useRef('');
  useEffect(()=>{active.current=true;return()=>{active.current=false;if(imageRef.current)URL.revokeObjectURL(imageRef.current);};},[]);
  async function read(file:File) {
    if(reading.current||disabled)return;
    reading.current=true;setOpen(true);setBusy(true);setError('');setReference(null);setText('');setFilename(file.name);
    if(imageRef.current)URL.revokeObjectURL(imageRef.current);imageRef.current='';setImage('');
    try {
      if(!file.size||file.size>20*1024*1024)throw Error('Choose a nonempty file under 20 MB.');
      const ext=file.name.split('.').at(-1)?.toLowerCase()??'';
      if(!['png','jpg','jpeg','webp','gif','pdf','txt','docx','xlsx','csv','tsv'].includes(ext))throw Error('Use a screenshot (PNG, JPG or WebP), PDF, Word, Excel, CSV or text reference.');
      if(['png','jpg','jpeg','webp','gif'].includes(ext)){imageRef.current=URL.createObjectURL(file);setImage(imageRef.current);}
      let source='';
      if(['docx','xlsx','csv','tsv'].includes(ext)) {
        const {readBillingCodeFile}=await import('@/lib/billing-code-import');
        const sheets=await readBillingCodeFile(file);source=sheets.map(s=>s.rows.map(r=>r.join('\t')).join('\n')).join('\n');
      } else source=await readTravelDocument(!file.type&&['png','jpg','jpeg','webp','gif'].includes(ext)?new File([file],file.name,{type:`image/${ext==='jpg'?'jpeg':ext}`}):file);
      if(!active.current)return;
      setText(source);setReference(analyzeTemplateReference(source));
    } catch(e){if(active.current)setError(e instanceof Error?e.message:'The reference could not be read. Try a clearer screenshot.');}
    finally{reading.current=false;if(active.current)setBusy(false);}
  }
  function update(change:Partial<VisualReference>){setReference(r=>r?{...r,...change}:r);setError('');}
  const fields=reference?renderReferenceFields(reference.fields,reference.bindings):{};
  function apply() {
    if(!reference||reference.kind==='unknown')return;
    if(reference.fields.some(f=>f.text.length>4000)){setError('Keep each template field under 4,000 characters.');return;}
    const examples=reference.bindings.filter(b=>b.example&&b.field);
    if(examples.some((b,i)=>examples.some((v,j)=>i!==j&&b.example===v.example&&b.field!==v.field))){setError('Give each example value one automatic field.');return;}
    let change:Partial<ExecutiveTemplates>;
    const kind=reference.kind;
    if(kind==='outlook') {
      if(!fields.outlookTitle?.trim()){setError('Enter the subject shown in your reference.');return;}
      const format:CalendarFormat={outlookTitle:fields.outlookTitle,outlookNotes:fields.outlookNotes??'',calendarLocation:fields.calendarLocation??'',calendarFlightFormat:'standard',...(reference.showAs!==undefined?{calendarShowAs:reference.showAs}:{}),...(reference.reminder!==undefined?{calendarReminderMinutes:reference.reminder}:{})};
      change=reference.scope==='all'?{...format,calendarFormats:undefined}:{calendarFormats:{...templates.calendarFormats,[reference.scope]:{...(templates.calendarFormats?.[reference.scope as keyof NonNullable<ExecutiveTemplates['calendarFormats']>]??{}),...format}}};
    } else if(kind==='print') {
      if(!fields.itineraryHeading?.trim()||!fields.itineraryTitle?.trim()){setError('Enter the heading and one reservation title from your reference.');return;}
      change={...fields,itineraryLayout:reference.layout??'list',itineraryFlightFormat:'standard'};
    } else change={...reference.expenseOptions,...fields};
    const example=kind==='outlook'?referencePreview(reference.bindings):null;
    if(example&&reference.scope!=='all')example.item.kind=reference.scope;
    onApply(change,kind,example);setOpen(false);setError('');
  }
  function chooseKind(kind:VisualReference['kind']) {
    if(!reference)return;
    const fields=kind==='outlook'?[{key:'outlookTitle',label:'Subject',text:''},{key:'calendarLocation',label:'Location',text:''},{key:'outlookNotes',label:'Body / notes',text:''}]:kind==='print'?[{key:'itineraryHeading',label:'Page heading',text:''},{key:'itineraryTitle',label:'One reservation title',text:''},{key:'itineraryBody',label:'One reservation’s details',text:''}]:[{key:'expenseHeading',label:'Report heading',text:'EXPENSE REPORT'}];
    update({kind,fields,bindings:[],scope:'all'});
  }
  const example=reference?referencePreview(reference.bindings):null;
  const preview=example?calendarTemplatePreview({...templates,...fields,calendarFormats:undefined,calendarFlightFormat:'standard'},example.item,example.trip):null;
  return <section className="reference-import" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files.length!==1){setError('Drop one reference at a time.');setOpen(true);return;}void read(e.dataTransfer.files[0]);}} aria-label="Create template from a reference">
    <div className="reference-intro"><CloudUpload className="size-5 shrink-0"/><div className="min-w-0 flex-1"><h3 className="font-semibold">Start with the way you already do it</h3><p className="mt-1 text-sm">Drop a screenshot or document. Anya detects the format and turns example booking details into automatic fields.</p></div><Button type="button" variant="outline" disabled={disabled||busy} onClick={()=>input.current?.click()}>{busy?<><Loader2 className="size-4 animate-spin"/>Reading…</>:'Upload reference'}</Button><button type="button" className="text-sm underline" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Hide':'Details'}</button></div>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label="Upload template reference" accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.docx,.xlsx,.csv,.tsv,.txt" disabled={disabled||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void read(file);}}/>
    {open&&<div className="reference-workspace">
      <p className="text-sm text-slate-600">For Outlook, include the subject, location, body, Show As and reminder. Start and end dates/times always come from each new confirmation. Outlook controls its own fonts and window styling.</p>
      {busy&&<p role="status" className="text-sm">Reading {filename}… Large screenshots may take a moment.</p>}
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      {reference&&<>
        <div className="flex flex-wrap items-center gap-3"><strong className="text-sm">{reference.kind==='outlook'?'Detected: Calendar entry':reference.kind==='print'?'Detected: Travel itinerary':reference.kind==='expenses'?'Detected: Expense report':'Format needs review'}</strong><select aria-label="Reference format" className="simple-select" value={reference.kind} onChange={e=>chooseKind(e.target.value as VisualReference['kind'])}><option value="unknown" disabled>Choose format</option><option value="outlook">Calendar entry</option><option value="print">Travel itinerary</option><option value="expenses">Expense report</option></select></div>
        <div className="reference-columns"><div className="min-w-0"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your reference · {filename}</p>{image?<img src={image} alt="Uploaded template reference" className="w-full rounded-md border bg-white"/>:<pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-white p-3 text-xs">{text}</pre>}</div>
          <div className="min-w-0 space-y-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recognized content · correct anything missed</p>{reference.fields.map(f=><label key={f.key} className="grid gap-1 text-sm font-medium">{f.label}{f.key.endsWith('Notes')||f.key==='itineraryBody'?<Textarea aria-label={`Reference ${f.label}`} rows={5} value={f.text} onChange={e=>update({fields:reference.fields.map(v=>v.key===f.key?{...v,text:e.target.value}:v)})}/>:<Input aria-label={`Reference ${f.label}`} value={f.text} onChange={e=>update({fields:reference.fields.map(v=>v.key===f.key?{...v,text:e.target.value}:v)})}/>}</label>)}
          {reference.kind==='outlook'&&<label className="grid gap-1 text-sm font-medium">Use for<select aria-label="Use calendar reference for" className="simple-select" value={reference.scope} onChange={e=>update({scope:e.target.value})}><option value="all">All calendar entries</option><option value="Flight">Flights only</option><option value="Hotel">Hotels only</option><option value="Car">Car rentals only</option><option value="Appointment">Appointments only</option></select></label>}
          </div></div>
        {reference.warnings.length>0&&<div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{reference.warnings.map((w,i)=><p key={i} className={i?'mt-1':''}>{w}</p>)}</div>}
        <details className="reference-mapping"><summary className="cursor-pointer text-sm font-semibold">Automatic fields · {reference.bindings.filter(b=>b.field).length} recognized</summary><p className="my-2 text-sm text-slate-600">These example values will change with each booking. Unmapped wording stays fixed. Add a mapping for any name, number or detail that should change.</p><div className="space-y-2">{reference.bindings.map((b,i)=><div key={i} className="reference-binding"><Input aria-label={`Example value ${i+1}`} value={b.example} onChange={e=>update({bindings:reference.bindings.map((v,j)=>j===i?{...v,example:e.target.value}:v)})}/><select aria-label={`Automatic field ${i+1}`} className="simple-select" value={b.field} onChange={e=>update({bindings:reference.bindings.map((v,j)=>j===i?{...v,field:e.target.value}:v)})}><option value="">Keep fixed text</option>{templateFields.map(v=><option key={v} value={v}>{`{${v}}`}</option>)}</select>{['departure','arrival'].includes(b.field)&&<select aria-label={`Time style ${i+1}`} className="simple-select" value={b.clock??''} onChange={e=>update({bindings:reference.bindings.map((v,j)=>j===i?{...v,clock:e.target.value||undefined}:v)})}><option value="">8:09pm</option>{clockFormats.map(v=><option key={v} value={v}>{({'compact-upper':'8:09PM','spaced-upper':'8:09 PM / 10 PM','spaced-lower':'8:09 pm / 10 pm','12-upper':'8:09 PM / 10:00 PM','12-lower':'8:09 pm / 10:00 pm','24':'20:09'} as Record<string,string>)[v]}</option>)}</select>}<Button size="icon" variant="ghost" aria-label={`Remove mapping ${i+1}`} onClick={()=>update({bindings:reference.bindings.filter((_,j)=>j!==i)})}><X className="size-4"/></Button></div>)}</div><Button type="button" variant="ghost" size="sm" onClick={()=>update({bindings:[...reference.bindings,{example:'',field:''}]})}><Plus className="size-4"/>Add automatic field</Button></details>
        <div className="reference-draft"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reusable draft</p>{Object.entries(fields).map(([key,value])=><pre key={key} className="mt-2 whitespace-pre-wrap break-words text-sm">{value||'(blank)'}</pre>)}{reference.kind==='outlook'&&preview&&<div className="mt-3 border-t pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example subject output</p><p className="mt-1 break-words font-semibold">{preview.title}</p></div>}</div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">Review here, then save through the template editor.</p><Button type="button" disabled={disabled||busy||reference.kind==='unknown'} onClick={apply}>Use this draft</Button></div>
      </>}
      {text&&<details><summary className="cursor-pointer text-sm text-slate-600">Correct extracted text</summary><Textarea aria-label="Extracted reference text" value={text} rows={8} className="my-2" onChange={e=>setText(e.target.value)}/><Button variant="outline" size="sm" onClick={()=>{try{setReference(analyzeTemplateReference(text));setError('');}catch(e){setError(e instanceof Error?e.message:'Could not read the text.');}}}>Read corrected text</Button></details>}
    </div>}
  </section>;
}
