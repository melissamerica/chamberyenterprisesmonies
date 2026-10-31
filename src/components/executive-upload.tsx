"use client";
import { useEffect, useRef, useState } from "react";
import { CloudUpload, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseLearningHint, ExpenseMemoryPanel, OptionalExpenseFeedback, useExpenseLearning } from "@/components/expense-learning";
import { suggestExpense, type LearningFeedback } from "@/lib/expense-learning";
import { readTravelDocument } from "@/lib/travel-confirmations";
import { assignedUploadTrips, expenseTripReviewPlan, automaticCalendarPlan, calendarRows, suggestedCalendarRows, cityForUpload, vendorForUpload, isOpenUploadTrip, isoDay, expenseRows, matchUploadRow, readUploadTable, tripWindow, uploadCategories, type UploadedFile, type UploadRow, type UploadTrip, type UploadExclusion, type VendorRule, type DeferredUpload, type UnassignedUpload } from "@/lib/workspace-uploads";

export function ExecutiveUpload({open,initialMode="expenses",reviewLater,calendarReview,onOpenChange,executive,trips,exclusions,rules,deferred,onRuleSaved,onRuleRemoved,onDeferred,onExcluded,onSaved,unassigned=[],onUnassigned=()=>{},focusRow,initialFile,initialText}:{open:boolean;initialFile?: File;initialText?: string;initialMode?:"expenses"|"calendar";unassigned?:UnassignedUpload[];onUnassigned?:(saved:UnassignedUpload[],removed:string[])=>void;focusRow?:string;reviewLater?:boolean;calendarReview?:boolean;onOpenChange:(value:boolean)=>void;executive:{id:string;name:string};trips:UploadTrip[];exclusions:UploadExclusion[];rules:VendorRule[];deferred:DeferredUpload[];onRuleSaved:(rule:VendorRule)=>void;onRuleRemoved:(id:string)=>void;onDeferred:(saved:DeferredUpload[],removed:string[])=>void;onExcluded:(values:UploadExclusion[])=>void;onSaved:(trips:UploadTrip[],kind:"expenses"|"itinerary",notice?:string)=>void}){
  const categoryTouched=useRef(new Set<string>());
  const [feedbackByRow,setFeedbackByRow]=useState<Record<string,LearningFeedback>>({});
  const input=useRef<HTMLInputElement>(null);const [mode,setMode]=useState<"expenses"|"calendar">("expenses");const [timezone,setTimezone]=useState("America/New_York");
  const [rows,setRows]=useState<UploadRow[]>(()=>unassigned.map(value=>value.row));const [files,setFiles]=useState<UploadedFile[]>([]);const [warnings,setWarnings]=useState<string[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState("");const [savedFiles,setSavedFiles]=useState<Record<string,UploadedFile>>({});const [retained,setRetained]=useState<File[]>([]);const [calendarText,setCalendarText]=useState<Array<{text:string;file:UploadedFile}>>([]);
  const intakeRead=useRef<File|null>(null);
  useEffect(()=>{if(open&&initialFile&&mode===initialMode&&intakeRead.current!==initialFile){intakeRead.current=initialFile;void readFiles([initialFile]);}},[open,initialFile,mode,initialMode]);
  const workingTripsRef=useRef(trips); workingTripsRef.current=trips;
  const [automaticSummary,setAutomaticSummary]=useState<Array<{id:number;name:string;count:number;amount:number}>>([]);

  const [excludedSummary,setExcludedSummary]=useState(0);
  const [choice,setChoice]=useState<{row:UploadRow;value:string;city:string}|null>(null);
  const [choiceError,setChoiceError]=useState("");
  const [newReceiptTrip,setNewReceiptTrip]=useState<{row:UploadRow;name:string}|null>(null);
  const [deferredEdits,setDeferredEdits]=useState<Record<string,Partial<UploadRow>>>({});
  const [choiceNotice,setChoiceNotice]=useState("");
  const [calendarSummary,setCalendarSummary]=useState<Array<{id:number;name:string;count:number}>>([]);
  const calendarReviewStarted=useRef(false);
  const importedCalendars=Array.from(new Map(trips.filter(isOpenUploadTrip).flatMap(trip=>trip.items.filter(item=>item.sourceFileId&&/\.ics$/i.test(item.source??"")).map(item=>[item.sourceFileId!,{id:item.sourceFileId!,name:item.source!}] as const))).values());
  useEffect(()=>{if(!open||!calendarReview){calendarReviewStarted.current=false;return;}if(!calendarReviewStarted.current){calendarReviewStarted.current=true;setMode("calendar");void reviewImportedCalendar();}},[open,calendarReview]);
  useEffect(()=>{if(open&&!calendarReview&&!reviewLater)setMode(initialMode);},[open,initialMode,calendarReview,reviewLater]);
  const pendingSignature=JSON.stringify(unassigned);
  useEffect(()=>{setRows(current=>[...current.filter(row=>row.kind==="meeting"),...unassigned.map(value=>current.find(row=>row.key===value.row.key)??value.row)]);},[pendingSignature]);
  const memory=useExpenseLearning(executive.id,open,rows.filter(row=>row.kind==="expense").length);
  useEffect(()=>{
    if(!open)return;
    setRows(current=>{let changed=false;const next=current.map(row=>{if(row.kind!=="expense"||categoryTouched.current.has(row.key))return row;const suggestion=suggestExpense(row,executive.id,memory.knowledge);if(suggestion?.status!=="confirmed"||!suggestion.category||suggestion.category===row.category)return row;changed=true;return {...row,category:suggestion.category};});return changed?next:current;});
  },[open,executive.id,memory.knowledge,rows]);
  const openTrips=trips.filter(isOpenUploadTrip);
  const deferredRows=deferred.map(value=>({...value.row,...deferredEdits[value.row.key]})).sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999")||a.key.localeCompare(b.key));
  const included=rows.filter(row=>row.selected&&row.kind==="meeting");const meetings=rows.filter(row=>row.kind==="meeting");const expenses=rows.filter(row=>row.kind==="expense");
  function edit(key:string,change:Partial<UploadRow>){if("category"in change)categoryTouched.current.add(key);if(deferred.some(value=>value.row.key===key)){setDeferredEdits(current=>({...current,[key]:{...current[key],...change}}));return;}setRows(current=>current.map(row=>{if(row.key!==key)return row;const next={...row,...change};if(change.tripId){next.suggestedAction=undefined;next.exclusionReason=undefined;next.selected=true;}if("tripId"in change||"date"in change||"amount"in change||"title"in change){const target=trips.filter(trip=>String(trip.id)===next.tripId);const matched=matchUploadRow({...next,duplicateId:undefined,duplicateChoice:"new"},target);return {...next,duplicateId:matched.duplicateId,duplicateChoice:matched.duplicateId===row.duplicateId?row.duplicateChoice:matched.duplicateChoice};}return next;}));setError("");}
  function calendarFor(text:string,file:UploadedFile,zone:string,working=workingTripsRef.current){const parsed=calendarRows(text,file,working.filter(isOpenUploadTrip),zone);return {rows:suggestedCalendarRows(parsed.rows,working),warnings:parsed.warnings};}
  async function reviewImportedCalendar(){
    if(busy)return;setError("");if(!importedCalendars.length){setError("Upload a calendar .ics file first, or import Alex’s sample calendar below.");return;}
    setBusy("Loading calendar entries for review…");const pending:File[]=[],stored:Record<string,UploadedFile>={};
    try{for(const source of importedCalendars){const response=await fetch(`/api/uploads/${source.id}`);if(!response.ok)throw new Error("The saved calendar could not load. Try again.");const file=new File([await response.text()],source.name,{type:"text/calendar",lastModified:0});pending.push(file);stored[`${file.name}:${file.size}:${file.lastModified}`]=source;}}
    catch(reason){setError(reason instanceof Error?reason.message:"The saved calendar could not load.");setBusy("");return;}
    setBusy("");await readFiles(pending,stored);
  }
  async function importSampleCalendar(){
    if(busy)return;setError("");setBusy("Loading Alex’s sample calendar…");
    let sample:File;
    try{const response=await fetch("/Alex_Morgan_Outlook_Export_Nov_4-6_2026.ics");if(!response.ok)throw new Error("The sample calendar could not load. Try again.");sample=new File([await response.text()],"Alex_Morgan_Outlook_Export_Nov_4-6_2026.ics",{type:"text/calendar",lastModified:0});}
    catch(reason){setError(reason instanceof Error?reason.message:"The sample calendar could not load.");setBusy("");return;}
    setBusy("");await readFiles([sample]);
  }

  async function persistUnassigned(pending:UploadRow[]) {
    if(!pending.length)return;
    const response=await fetch("/api/uploads/unassigned",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({executiveId:executive.id,executiveName:executive.name,rows:pending})});
    const result=await response.json()as{unassigned?:UnassignedUpload[];error?:string};
    if(!response.ok||!result.unassigned)throw new Error(result.error||"The unassigned receipts could not save. Try again.");
    onUnassigned(result.unassigned,[]);
  }
  async function addTransaction(file:UploadedFile) {
    if(busy)return;setBusy("Saving unassigned receipt…");setError("");
    const row:UploadRow={key:`${file.id}:manual-${crypto.randomUUID()}`,fileId:file.id,source:file.name,kind:"expense",title:"",date:"",amount:"",category:"Misc.",detail:"Entered from uploaded source",location:"",tripId:"",match:"Which trip does this belong to?",selected:true,duplicateChoice:"new"};
    setRows(current=>[...current,row]);
    try{await persistUnassigned([row]);}catch(reason){setError(reason instanceof Error?reason.message:"The receipt could not save.");}finally{setBusy("");}
  }
  async function retryUnassigned() {
    if(busy)return;setBusy("Saving unassigned receipts…");setError("");
    try{await persistUnassigned(rows.filter(row=>row.kind==="expense"));setRetained([]);setChoiceNotice("Unassigned receipts saved.");}catch(reason){setError(reason instanceof Error?reason.message:"The receipts could not save.");}finally{setBusy("");}
  }
  async function persistRows(assignments:UploadRow[], working:UploadTrip[], automatic=false) {
    const next=assignedUploadTrips(working,assignments,executive.id);
    const response=await fetch("/api/uploads",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({trips:next})});
    const result=await response.json()as{error?:string};if(!response.ok)throw new Error(result.error||"The imported entries could not save. Try again.");
    onUnassigned([],assignments.filter(row=>row.kind==="expense").map(row=>row.key));
    const merged=working.map(trip=>next.find(saved=>saved.id===trip.id)??trip);workingTripsRef.current=merged;
    const calendarImport=assignments.every(row=>row.kind==="meeting");
    if(automatic&&calendarImport)setCalendarSummary(current=>{const summary=[...current];for(const trip of next){const count=assignments.filter(row=>row.tripId===String(trip.id)).length;const index=summary.findIndex(value=>value.id===trip.id);if(index>=0)summary[index]={...summary[index],count:summary[index].count+count};else summary.push({id:trip.id,name:trip.name,count});}return summary;});
    if(automatic&&!calendarImport)setAutomaticSummary(current=>{const summary=[...current];for(const trip of next){const assigned=assignments.filter(row=>row.tripId===String(trip.id));const prior=summary.findIndex(saved=>saved.id===trip.id);const count=assigned.length,amount=assigned.reduce((sum,row)=>sum+Number(row.amount),0);if(prior>=0)summary[prior]={...summary[prior],count:summary[prior].count+count,amount:summary[prior].amount+amount};else summary.push({id:trip.id,name:trip.name,count,amount});}return summary;});
    onSaved(next,assignments.some(row=>row.kind==="meeting")?"itinerary":"expenses",automatic?`Automatically added ${assignments.length} ${calendarImport?"calendar entries":assignments.length===1?"expense":"expenses"} to ${next.length===1?next[0].name:`${next.length} trips`}${calendarImport?" itinerary":""}.`:undefined);
    return merged;
  }
  async function readFiles(list:File[],stored:Record<string,UploadedFile>={}){
    if(busy||!list.length)return;setRetained(list);setError("");let staged=[...rows];let sources=[...files];const messages:string[]=[];let cached={...savedFiles,...stored};setSavedFiles(cached);let calendars=[...calendarText];let activeCalendarZone=timezone;let working=[...workingTripsRef.current];
    try{for(const file of list){setBusy(`Reading ${file.name}…`);if(file.size>20*1024*1024)throw new Error(`${file.name}: use a file under 20 MB.`);if(mode==="calendar"&&!/\.ics$/i.test(file.name))throw new Error("Upload an Outlook or Google Calendar .ics export for calendar meetings.");
      const identity=`${file.name}:${file.size}:${file.lastModified}`;let saved=cached[identity];if(!saved){const form=new FormData();form.set("file",file);form.set("executiveId",executive.id);const response=await fetch("/api/uploads",{method:"POST",body:form});const result=await response.json()as{file?:UploadedFile;error?:string};if(!response.ok||!result.file)throw new Error(result.error||"The file could not save.");saved=result.file;cached[identity]=saved;setSavedFiles(cached);}
      if(staged.some(row=>row.fileId===saved.id)){messages.push(`${file.name} is already waiting for a decision.`);continue;}
      if(!sources.some(source=>source.id===saved.id))sources.push(saved);setFiles(sources);
      if(mode==="calendar"||/\.ics$/i.test(file.name)){
        const text=await file.text();let zone=activeCalendarZone;const exportedZone=text.match(/^X-WR-TIMEZONE:([^\r\n]+)/im)?.[1]?.trim();if(exportedZone&&!calendars.length){try{new Intl.DateTimeFormat("en-US",{timeZone:exportedZone});zone=exportedZone;setTimezone(zone);}catch{messages.push("Calendar time zone was not recognized; review the display time zone.");}}
        activeCalendarZone=zone;const calendar=calendarFor(text,saved,zone,working),plan=automaticCalendarPlan(calendar.rows,working);messages.push(...calendar.warnings);calendars.push({text,file:saved});setCalendarText(calendars);
        if(plan.automatic.length){setBusy(`Adding ${plan.automatic.length} calendar entries to their itineraries…`);try{working=await persistRows(plan.automatic,working,true);}catch(reason){staged.push(...plan.automatic,...plan.review);setRows(staged);throw reason;}}
        staged.push(...plan.review);setRows(staged);
        messages.push(`${file.name}: ${calendar.rows.length} calendar entries found during travel days · ${plan.automatic.length} added · ${plan.ignored} already included · ${plan.review.length} for your review.`);
        if(plan.review.length)messages.push(`${file.name}: ${plan.review.length} optional or unclear calendar entries need your choice. Clear travel and destination appointments are already on the itinerary.`);
        if(plan.ignored)messages.push(`${file.name}: ${plan.ignored} calendar entries already on an itinerary were skipped.`);
        if(!calendar.rows.length)messages.push(`${file.name}: no entries during this executive’s travel days.`);
      }
      else{const table=await readUploadTable(file);const text=table?"":/\.csv$/i.test(file.name)?await file.text():file===initialFile&&initialText!==undefined?initialText:await readTravelDocument(file);const parsed=expenseRows(text,saved,table);const plan=expenseTripReviewPlan(parsed,working,staged,exclusions,rules,deferred);
        const pending=plan.review;
        try{await persistUnassigned(pending);}catch(reason){staged.push(...pending);setRows(staged);throw reason;}
        staged.push(...plan.review);setRows(staged);
        if(plan.review.length)messages.push(`${file.name}: ${plan.review.length} ${plan.review.length===1?"expense needs":"expenses need"} your confirmation. Suggested trips are shown below; nothing has been added yet.`);
        if(plan.ignored)messages.push(`${file.name}: ${plan.ignored} ${plan.ignored===1?"payment, previously imported, or deferred item was":"payments, previously imported, or deferred items were"} skipped.`);
      }
    }setRetained([]);setWarnings(current=>[...current,...messages]);}catch(reason){setError(reason instanceof Error?reason.message:"The file could not be read. Try again.");setWarnings(current=>[...current,...messages]);}finally{setBusy("");if(input.current)input.current.value="";}
  }
  async function retryAutomatic(){
    if(busy)return;setError("");setBusy("Refreshing trip suggestions…");
    const plan=expenseTripReviewPlan(rows.filter(row=>row.kind==="expense"),workingTripsRef.current,[],exclusions,rules,deferred);
    try{await persistUnassigned(plan.review);setRows(current=>[...current.filter(row=>row.kind!=="expense"),...plan.review]);setChoiceNotice("Trip suggestions refreshed. Confirm a trip before adding each receipt.");}
    catch(reason){setError(reason instanceof Error?reason.message:"The suggestions could not save. Try again.");}finally{setBusy("");}
  }
  async function retryCalendarAutomatic(){
    if(busy)return;setError("");const plan=automaticCalendarPlan(rows.filter(row=>row.kind==="meeting"),workingTripsRef.current);
    if(!plan.automatic.length){setError("The remaining calendar entries need your choice.");return;}
    setBusy("Adding calendar entries to itineraries…");try{await persistRows(plan.automatic,workingTripsRef.current,true);const keys=new Set(plan.automatic.map(row=>row.key));setRows(current=>current.filter(row=>!keys.has(row.key)));setRetained([]);}catch(reason){setError(reason instanceof Error?reason.message:"The calendar entries could not save. Try again.");}finally{setBusy("");}
  }
  function choose(row:UploadRow,value:string){
    if(!value||busy)return;
    setError("");setChoiceError("");
    if(value==="later"){void saveChoice(row,value,false);return;}
    const target=openTrips.filter(trip=>String(trip.id)===value);
    const matched=value==="exclude"?row:matchUploadRow({...row,duplicateId:undefined,duplicateChoice:"new"},target,value);
    if(matched.duplicateId===row.duplicateId)matched.duplicateChoice=row.duplicateChoice;
    setChoice({row:matched,value,city:cityForUpload(row)});
  }
  async function saveChoice(original:UploadRow,value:string,remember:boolean,city=cityForUpload(original),newTrip?:UploadTrip,learning?:LearningFeedback){
    if(busy)return;const row={...original,city,tripId:value==="exclude"||value==="later"?"":value,selected:true,suggestedAction:undefined,exclusionReason:undefined};
    const assigning=value!=="exclude"&&value!=="later";
    if(assigning&&(!row.title.trim()||!isoDay(row.date)||!row.amount.trim()||!Number.isFinite(Number(row.amount))||row.duplicateId&&!row.duplicateChoice)){setChoiceError("Enter the description, date, amount, and any duplicate decision before saving.");return;}
    const candidateTrips=newTrip?[...workingTripsRef.current,newTrip]:workingTripsRef.current;
    const next=assigning?assignedUploadTrips(candidateTrips.filter(isOpenUploadTrip),[row],executive.id)[0]:undefined;
    if(assigning&&!next){setChoiceError("Choose an open trip.");return;}
    setBusy("Saving your choice…");setChoiceError("");setError("");
    try{
      const response=await fetch("/api/uploads/decisions",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({executiveId:executive.id,row,choice:value,remember,trip:next,learning})});
      const result=await response.json()as{trips?:UploadTrip[];exclusions?:UploadExclusion[];deferred?:DeferredUpload[];rule?:VendorRule;error?:string;learningWarning?:string};if(!response.ok)throw new Error(result.error||"Your choice could not save.");
      if(result.trips?.length){workingTripsRef.current=[...workingTripsRef.current.map(trip=>result.trips!.find(saved=>saved.id===trip.id)??trip),...result.trips.filter(trip=>!workingTripsRef.current.some(existing=>existing.id===trip.id))];onSaved(result.trips,"expenses",`Added ${row.title} to ${next!.name}.`);}
      if(result.exclusions?.length){onExcluded(result.exclusions);setExcludedSummary(current=>current+1);}
      onUnassigned([],[row.key]);
      onDeferred(result.deferred??[],value==="later"?[]:[row.key]);
      if(result.rule)onRuleSaved(result.rule);
      setRows(current=>current.filter(value=>value.key!==row.key));setChoice(null);setNewReceiptTrip(null);
      setChoiceNotice((value==="later"?"Moved to Review later.":remember?"Choice saved and remembered for this vendor in this city.":(learning?.rememberCategory&&!result.learningWarning?"Transaction saved; category preference remembered.":"Choice saved for this transaction."))+(result.learningWarning?` ${result.learningWarning}`:""));
    }catch(reason){const message=reason instanceof Error?reason.message:"Your choice could not save. Try again.";if(value==="later")setError(message);else setChoiceError(message);}finally{setBusy("");}
  }
  async function forgetRule(rule:VendorRule){
    if(busy)return;setBusy("Removing remembered choice…");setError("");
    try{const response=await fetch("/api/uploads/decisions",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({executiveId:executive.id,id:rule.id})});const result=await response.json()as{error?:string};if(!response.ok)throw new Error(result.error||"The choice could not be removed.");onRuleRemoved(rule.id);}catch(reason){setError(reason instanceof Error?reason.message:"The choice could not be removed.");}finally{setBusy("");}
  }
  async function deleteFromReview(row:UploadRow){
    if(busy)return;setBusy("Deleting from review history…");setError("");
    try{const response=await fetch("/api/uploads/decisions",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({executiveId:executive.id,reviewKey:row.key})});const result=await response.json()as{error?:string};if(!response.ok)throw new Error(result.error||"The receipt could not be deleted.");onDeferred([],[row.key]);setChoiceNotice("Deleted from review history.");}catch(reason){setError(reason instanceof Error?reason.message:"The receipt could not be deleted.");}finally{setBusy("");}
  }
  function changeTimezone(zone:string){setTimezone(zone);if(!calendarText.length)return;const rebuilt=calendarText.map(({text,file})=>calendarFor(text,file,zone));setRows(current=>[...current.filter(row=>row.kind==="expense"),...rebuilt.flatMap(value=>value.rows).filter(row=>row.calendarSuggestion!=="existing").map(row=>{const prior=current.find(value=>value.calendarUid===row.calendarUid);return prior&&row.duplicateChoice!=="skip"?{...row,selected:prior.selected}:row;})]);setWarnings(rebuilt.flatMap(value=>value.warnings));}
  async function apply(){
    setError("");if(!included.length){setError("Select at least one expense or meeting to include.");return;}
    for(const row of included){if(!row.tripId||!trips.some(trip=>String(trip.id)===row.tripId)){setError(`Choose a trip for “${row.title||row.source}”.`);return;}if(!row.title.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)){setError(`Enter a description and date for “${row.title||row.source}”.`);return;}if(row.kind==="expense"&&(!row.amount.trim()||!Number.isFinite(Number(row.amount)))){setError(`Enter the amount for “${row.title}”.`);return;}if(row.duplicateId&&!row.duplicateChoice){setError(`Choose whether “${row.title}” updates the existing expense or adds a new one.`);return;}if(row.duplicateChoice==="skip"){setError("Uncheck meetings that are already in an itinerary.");return;}}
    // Catch duplicate rows within the same upload batch before adding them twice.
    const fingerprints=new Set<string>();for(const row of included.filter(row=>row.kind==="expense"&&row.duplicateChoice!=="update")){const key=`${row.tripId}|${row.date}|${Number(row.amount)}|${row.title.toLowerCase().replace(/\W/g,"")}`;if(fingerprints.has(key)){setError(`“${row.title}” appears twice in this upload. Uncheck the duplicate.`);return;}fingerprints.add(key);}
    setBusy("Saving your decisions…");try{await persistRows(included,workingTripsRef.current);setRows([]);setFiles([]);setWarnings([]);setSavedFiles({});setCalendarText([]);setRetained([]);setAutomaticSummary([]);onOpenChange(false);}catch(reason){setError(reason instanceof Error?reason.message:"The selections could not save. Try again.");}finally{setBusy("");}
  }
  function renderRow(row:UploadRow,later=false){if(later&&row.reviewStatus==="assigned")return <section key={row.key} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{row.title}</p><p className="text-sm">{row.date} · ${Number(row.amount).toFixed(2)}</p></div><p className="text-sm text-emerald-800">Assigned to {trips.find(trip=>String(trip.id)===row.reviewTripId)?.name||"trip"}</p><a href={`/api/uploads/${row.fileId}`} className="text-sm text-[#6b3f78] underline" target="_blank" rel="noreferrer">{row.source}</a><div><Button type="button" size="sm" variant="ghost" onClick={()=>void deleteFromReview(row)}>Delete from review list</Button></div></section>;return <section key={row.key} id={`${row.key}-receipt`} tabIndex={-1} className={`rounded-lg border p-4 ${row.selected?"border-[#b6a3bd]":"border-slate-200 bg-slate-50"}`}><div className="mb-3 flex items-start justify-between gap-3"><label className="flex items-start gap-3 text-sm font-medium">{row.kind==="meeting"&&<input type="checkbox" className="mt-1" aria-label={`Include ${row.title||row.source} on itinerary`} checked={row.selected} disabled={row.duplicateChoice==="skip"} onChange={event=>edit(row.key,{selected:event.target.checked})}/>}<span>{row.kind==="meeting"?"Meeting":later?"Review later":"Expense needs a decision"} · {row.source}{row.kind==="meeting"&&<span className="mt-1 block font-normal text-slate-600">{row.allDay?"All day":row.category}{!row.end&&!row.allDay&&" · End time missing"}</span>}</span></label>{row.kind==="meeting"&&<Button type="button" variant="ghost" size="sm" aria-label={`Remove ${row.title||row.source} from review`} onClick={()=>setRows(current=>current.filter(value=>value.key!==row.key))}><X className="size-4"/></Button>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1"><Label htmlFor={`${row.key}-title`}>{row.kind==="meeting"?"Meeting":"Description"}</Label><Input id={`${row.key}-title`} value={row.title} onChange={event=>edit(row.key,{title:event.target.value})}/></div><div className="grid gap-1"><Label htmlFor={`${row.key}-date`}>Date</Label><Input id={`${row.key}-date`} type="date" value={row.date} readOnly={row.kind==="meeting"} onChange={event=>edit(row.key,{date:event.target.value})}/></div>
        {row.kind==="expense"&&<><div className="grid gap-1"><Label htmlFor={`${row.key}-amount`}>Amount (USD)</Label><Input id={`${row.key}-amount`} type="number" step="0.01" value={row.amount} onChange={event=>edit(row.key,{amount:event.target.value})}/></div><div className="grid gap-1"><Label htmlFor={`${row.key}-category`}>Category</Label><select id={`${row.key}-category`} className="simple-select" value={row.category} onChange={event=>edit(row.key,{category:event.target.value})}>{uploadCategories.map(category=><option key={category}>{category}</option>)}</select></div></>}
        {row.kind==="expense"&&<ExpenseLearningHint row={row} executiveId={executive.id} knowledge={memory.knowledge} onCategory={category=>edit(row.key,{category})} onExclude={()=>choose(row,"exclude")}/>}
        <div className="grid gap-2 sm:col-span-2">{row.kind==="expense"?<>
          <p className={`text-sm ${row.exclusionReason||!row.tripId?"text-red-700":"text-slate-600"}`}>{row.exclusionReason||row.match||"This transaction needs a decision."}</p>
          {!row.exclusionReason&&(()=>{const suggested=openTrips.find(trip=>String(trip.id)===row.tripId);const complete=!!row.title.trim()&&!!isoDay(row.date)&&!!row.amount.trim()&&Number.isFinite(Number(row.amount));return suggested?<div className="space-y-2 rounded-md bg-slate-50 p-3"><p className="text-sm font-medium">Do you want to add this receipt to “{suggested.name}”?</p><p className="text-sm text-slate-600">{suggested.dates} · {suggested.route}</p><Button type="button" size="sm" variant="outline" disabled={!complete} onClick={()=>choose(row,String(suggested.id))}>Yes, add to this trip</Button></div>:<div className="space-y-2 rounded-md bg-slate-50 p-3"><p className="text-sm">{!complete?"Complete the receipt’s description, date, and amount to check for a matching trip.":/More than one trip/i.test(row.match)?"More than one trip may match. Choose a trip below, or create a new one.":"This receipt does not appear to match an existing trip. Would you like to create a new trip?"}</p><Button type="button" size="sm" variant="outline" disabled={!complete} onClick={()=>{setChoiceError("");setNewReceiptTrip({row,name:cityForUpload(row)?`${cityForUpload(row)} trip`:"New trip"});}}>Create a new trip</Button></div>;})()}
          <Label htmlFor={`${row.key}-decision`}>Choose how to handle this transaction</Label>
          <select id={`${row.key}-decision`} className="simple-select w-full" value="" onChange={event=>choose(row,event.target.value)}>
            <option value="">Choose an option…</option><option value="exclude">Non-travel receipt — delete</option>
            <optgroup label="Open trips">{openTrips.map(trip=><option key={trip.id} value={trip.id}>{trip.name} · {trip.dates}</option>)}</optgroup>
            {!later&&<option value="later">Review later</option>}
          </select>
          {<div className="flex flex-wrap items-center gap-3"><a href={`/api/uploads/${row.fileId}`} target="_blank" rel="noreferrer" className="text-sm text-[#6b3f78] underline">View original receipt or statement</a>{later&&<Button type="button" size="sm" variant="ghost" onClick={()=>void deleteFromReview(row)}>Delete from review list</Button>}</div>}
        </>:<><Label htmlFor={`${row.key}-trip`}>Apply to trip</Label><select id={`${row.key}-trip`} className="simple-select w-full" value={row.tripId} onChange={event=>edit(row.key,{tripId:event.target.value})}><option value="">Choose a trip…</option>{openTrips.map(trip=><option key={trip.id} value={trip.id}>{trip.name} · {trip.dates}</option>)}</select><p className="text-sm text-slate-500">{row.match}</p></>}</div>

        {row.location&&<p className="text-sm text-slate-600 sm:col-span-2">Location: {row.location}</p>}
        {row.kind==="meeting"&&row.detail&&<details className="text-sm text-slate-600 sm:col-span-2"><summary className="cursor-pointer font-medium">Appointment details</summary><p className="mt-2 whitespace-pre-wrap">{row.detail}</p></details>}

        </div></section>;}
  return <><Dialog open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl" onOpenAutoFocus={event=>{if(focusRow||reviewLater){event.preventDefault();const list=document.getElementById(focusRow?`${focusRow}-receipt`:"deferred-upload-list");list?.focus();list?.scrollIntoView({block:"start"});}}}><DialogHeader><DialogTitle>Upload · {executive.name}</DialogTitle><DialogDescription>Receipts and statement transactions suggest matching trips for your confirmation. If no trip matches, you can create one. Clear calendar entries still go straight into their matching itineraries.</DialogDescription></DialogHeader>
    <fieldset disabled={!!busy} className="min-w-0 space-y-5">
      {!initialFile&&<div className="flex flex-wrap gap-2"><Button type="button" variant={mode==="expenses"?"default":"outline"} onClick={()=>setMode("expenses")}>Receipts &amp; statements</Button><Button type="button" variant={mode==="calendar"?"default":"outline"} onClick={()=>setMode("calendar")}>Calendar meetings</Button></div>}
      {mode==="calendar"&&importedCalendars.length>0&&<Button type="button" variant="outline" onClick={()=>void reviewImportedCalendar()}>Review imported calendar</Button>}
      {mode==="calendar"?<div className="space-y-3"><p className="text-sm text-slate-600">Export the executive’s calendar from Outlook or Google Calendar as .ics. Meetings during the trips below appear for selection. Clear travel entries and appointments physically in the destination city are added to the itinerary automatically. Only optional or unclear entries appear below. Check any of those you also want on the printed itinerary.</p><div className="grid gap-2 sm:max-w-sm"><Label htmlFor="upload-timezone">Display time zone</Label><select id="upload-timezone" className="simple-select" value={timezone} onChange={event=>changeTimezone(event.target.value)}><option value="America/New_York">Eastern</option><option value="America/Chicago">Central</option><option value="America/Denver">Mountain</option><option value="America/Los_Angeles">Pacific</option><option value="Europe/London">London</option><option value="UTC">UTC</option></select></div><div className="rounded-lg bg-slate-50 p-3 text-sm">{trips.length?trips.map(trip=>{const window=tripWindow(trip);return <p key={trip.id}>{trip.name}: {window?`${window.first} – ${window.last}`:"travel dates needed"}</p>;}):"Create a trip with travel dates first."}</div></div>:<p className="text-sm text-slate-600">Receipts: PDF or photos. Statements: PDF, CSV, or Excel (.xlsx). Each transaction is checked against the executive’s travel dates. Confirm the suggested trip before it is added. One statement can cover several trips. If no trip appears to match, you can create one. Missing details and possible duplicates remain available for review. For each unsorted expense, choose an open trip, non-travel, or Review later.</p>}
      {!initialFile&&<><button type="button" disabled={!!busy} className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-[#b6a3bd] bg-[#faf8fb] p-6 text-sm font-medium text-[#56315f]" onClick={()=>input.current?.click()} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();void readFiles(Array.from(event.dataTransfer.files));}}><CloudUpload className="size-5"/>Choose files or drop them here</button><input ref={input} type="file" className="hidden" multiple accept={mode==="calendar"?".ics":".pdf,image/*,.csv,.xlsx,.txt"} onChange={event=>{if(event.target.files)void readFiles(Array.from(event.target.files));}}/></>}
      {mode==="calendar"&&executive.name.trim().toLowerCase()==="alex morgan"&&openTrips.some(trip=>{const window=tripWindow(trip);return /DEN\b/.test(trip.route)&&window&&window.first<="2026-11-04"&&window.last>="2026-11-06";})&&<div className="rounded-lg border border-slate-200 p-4 text-sm"><p className="mb-2 text-slate-600">Alex’s mock Outlook calendar · November 4–6 · 30 entries, including Denver conference sessions, Uber holds, dinner, and remote meetings.</p><Button type="button" variant="outline" size="sm" onClick={()=>void importSampleCalendar()}>Import Alex’s sample calendar</Button></div>}
      {files.length>0&&<div className="flex flex-wrap gap-3 text-sm">{files.map(file=><a key={file.id} href={`/api/uploads/${file.id}`} className="break-all text-[#6b3f78] underline" target="_blank" rel="noreferrer">{file.name}</a>)}</div>}
      {automaticSummary.length>0&&<section role="status" className="space-y-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Automatically added to trips</p>{automaticSummary.map(summary=><div key={summary.id} className="flex flex-wrap justify-between gap-2"><a href={`?view=expenses&executive=${encodeURIComponent(executive.id)}&trip=${summary.id}`} className="underline">{summary.name}</a><span>{summary.count} {summary.count===1?"expense":"expenses"} · ${summary.amount.toFixed(2)}</span></div>)}</section>}
      {calendarSummary.length>0&&<section role="status" className="space-y-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Automatically added to itineraries</p>{calendarSummary.map(summary=><div key={summary.id} className="flex flex-wrap justify-between gap-2"><a href={`?view=itinerary&executive=${encodeURIComponent(executive.id)}&trip=${summary.id}`} className="underline">{summary.name}</a><span>{summary.count} calendar entries</span></div>)}</section>}
      {excludedSummary>0&&<p role="status" className="text-sm text-slate-600">{excludedSummary} {excludedSummary===1?"charge approved":"charges approved"} as non-travel and removed from the expense queue.</p>}
      {choiceNotice&&<p role="status" className="text-sm text-emerald-800">{choiceNotice}</p>}
      {warnings.length>0&&<div role="status" className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{warnings.map((warning,index)=><p key={index}>{warning}</p>)}</div>}
      {rows.length>0&&<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3"><p className="text-sm font-medium">{expenses.length} expenses need a decision · {meetings.length} meetings · {included.length} selected</p><div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" size="sm" onClick={()=>setRows(current=>current.map(row=>({...row,selected:row.kind==="meeting"&&row.duplicateChoice!=="skip"})))}>Select all</Button><Button type="button" variant="ghost" size="sm" onClick={()=>setRows(current=>current.map(row=>({...row,selected:false})))}>Clear selection</Button></div></div>}
      {meetings.length>0&&<p className="text-sm text-slate-600">Check the appointments you want printed, then choose Add selected entries to itinerary. Unchecked appointments stay off the itinerary.</p>}
      <div className="space-y-4">{rows.map(row=>renderRow(row))}</div>
      <section id="deferred-upload-list" tabIndex={-1} className="space-y-3 border-t border-slate-200 pt-4"><h3 className="font-semibold">Review later · {deferredRows.length}</h3><p className="text-sm text-slate-600">Across all of {executive.name}’s trips, oldest transaction first. Only receipts you send here appear; they stay until deleted.</p>{deferredRows.length?<div className="space-y-4">{deferredRows.map(row=>renderRow(row,true))}</div>:<p className="text-sm text-slate-500">No transactions waiting for later.</p>}</section>
      {mode==="expenses"&&<ExpenseMemoryPanel memory={memory}/>}
      {rules.length>0&&<details className="rounded-lg border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-medium">Remembered vendor choices · {rules.length}</summary><div className="mt-3 space-y-3">{rules.map(rule=><div key={rule.id} className="flex flex-wrap items-center justify-between gap-2"><span>{rule.vendor} · {rule.city} · {rule.action==="exclude"?"Non-travel":trips.find(trip=>String(trip.id)===rule.tripId)?.name||"Trip unavailable"}</span><Button type="button" size="sm" variant="ghost" onClick={()=>void forgetRule(rule)}>Forget choice</Button></div>)}</div></details>}

      {mode==="expenses"&&files.length>0&&<Button type="button" variant="outline" size="sm" onClick={()=>void addTransaction(files[files.length-1])}><Plus/>Add a transaction from this file</Button>}
    </fieldset>
    {busy&&<p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="size-4 animate-spin"/>{busy}</p>}{error&&<div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"><p>{error}</p>{rows.some(row=>row.kind==="expense")&&<Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={()=>void retryUnassigned()}>Retry saving unassigned receipts</Button>}{rows.some(row=>row.kind==="meeting"&&(row.calendarSuggestion==="travel"||row.calendarSuggestion==="destination"))&&<Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={()=>void retryCalendarAutomatic()}>Retry automatic calendar import</Button>}{rows.some(row=>row.kind==="expense"&&row.tripId)&&<Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={()=>void retryAutomatic()}>Refresh trip suggestions</Button>}{retained.length>0&&<Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={()=>void readFiles(retained)}>Retry files</Button>}</div>}
    <DialogFooter><Button type="button" variant="outline" disabled={!!busy} onClick={()=>onOpenChange(false)}>Close</Button>{meetings.length>0&&<Button type="button" disabled={!!busy||!included.length} onClick={()=>void apply()}>{included.some(row=>row.kind==="meeting")?"Add selected entries to itinerary":"Save decisions"}</Button>}</DialogFooter>
  </DialogContent></Dialog>
  <Dialog open={!!newReceiptTrip} onOpenChange={value=>{if(!value&&!busy)setNewReceiptTrip(null);}}><DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>Create a trip for this receipt?</DialogTitle><DialogDescription>The trip and receipt are saved only when you confirm below.</DialogDescription></DialogHeader>
    {newReceiptTrip&&<><div className="rounded-md bg-slate-50 p-3 text-sm"><p className="font-medium">{newReceiptTrip.row.title}</p><p className="mt-1 text-slate-600">{executive.name} · {newReceiptTrip.row.date} · ${Number(newReceiptTrip.row.amount).toFixed(2)}</p></div><div className="grid gap-2"><Label htmlFor="receipt-new-trip-name">Trip name</Label><Input id="receipt-new-trip-name" disabled={!!busy} maxLength={240} value={newReceiptTrip.name} onChange={event=>setNewReceiptTrip({...newReceiptTrip,name:event.target.value})}/></div>{choiceError&&<p role="alert" className="text-sm text-red-700">{choiceError}</p>}<DialogFooter><Button type="button" variant="outline" disabled={!!busy} onClick={()=>setNewReceiptTrip(null)}>Cancel</Button><Button type="button" disabled={!!busy||!newReceiptTrip.name.trim()} onClick={()=>{const draft:UploadTrip={id:Date.now(),executiveId:executive.id,traveler:executive.name,name:newReceiptTrip.name.trim(),dates:newReceiptTrip.row.date,route:cityForUpload(newReceiptTrip.row)||newReceiptTrip.row.location||"Destination pending",items:[]};void saveChoice(newReceiptTrip.row,String(draft.id),false,cityForUpload(newReceiptTrip.row),draft);}}>Create trip and add receipt</Button></DialogFooter></>}
  </DialogContent></Dialog>
  <Dialog open={!!choice} onOpenChange={value=>{if(!value&&!busy)setChoice(null);}}><DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>Remember this choice?</DialogTitle><DialogDescription>Do you want me to remember this selection for this vendor in this city for future transactions?</DialogDescription></DialogHeader>
    {choice&&<><p className="text-sm font-medium">{vendorForUpload(choice.row)||"Vendor not identified"} · {choice.value==="exclude"?"Non-travel receipt — delete":openTrips.find(trip=>String(trip.id)===choice.value)?.name}</p><div className="grid gap-2"><Label htmlFor="remember-vendor-city">City</Label><Input id="remember-vendor-city" value={choice.city} disabled={!!busy} placeholder="Enter city to remember this choice" onChange={event=>setChoice({...choice,city:event.target.value})}/><p className="text-sm text-slate-600">Applies to {executive.name}’s future transactions from this vendor in this city.</p></div>
      {choice.value!=="exclude"&&choice.row.duplicateId&&<div className="grid gap-2"><Label htmlFor="remember-duplicate">Possible duplicate expense</Label><select id="remember-duplicate" disabled={!!busy} className="simple-select" value={choice.row.duplicateChoice} onChange={event=>setChoice({...choice,row:{...choice.row,duplicateChoice:event.target.value}})}><option value="">Choose how to apply…</option><option value="update">Attach receipt and update existing expense</option><option value="new">Add as a separate expense</option></select></div>}
      <OptionalExpenseFeedback row={choice.row} assigning={choice.value!=="exclude"} value={feedbackByRow[choice.row.key]} onChange={value=>setFeedbackByRow(current=>({...current,[choice.row.key]:value}))}/>
      {choiceError&&<p role="alert" className="text-sm text-red-700">{choiceError}</p>}
      <DialogFooter><Button variant="ghost" disabled={!!busy} onClick={()=>setChoice(null)}>Cancel</Button><Button variant="outline" disabled={!!busy} onClick={()=>void saveChoice(choice.row,choice.value,false,choice.city,undefined,feedbackByRow[choice.row.key])}>{feedbackByRow[choice.row.key]?.rememberCategory?"Save transaction & category preference":"Just this transaction"}</Button><Button disabled={!!busy||!choice.city.trim()||!vendorForUpload(choice.row).trim()} onClick={()=>void saveChoice(choice.row,choice.value,true,choice.city,undefined,feedbackByRow[choice.row.key])}>{feedbackByRow[choice.row.key]?.rememberCategory?"Remember trip choice too":"Remember for future transactions"}</Button></DialogFooter></>}
  </DialogContent></Dialog></>;
}
