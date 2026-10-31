"use client";

import { useEffect, useRef, useState } from "react";
import ExecutiveMediaRecorder from "./ExecutiveMediaRecorder";
import type { ExecutiveDecision, DecisionAnswerPayload, ReplyMethod, DelegateOption, DelegationMode } from "../contracts/decision";
import "./executive-decision-queue.css";

const ACTIONS: Array<{ id:ReplyMethod; label:string }> = [
  {id:"choice",label:"Select an answer"},
  {id:"typed",label:"Send written reply"},
  {id:"voice",label:"Send voice reply"},
  {id:"video",label:"Send video reply"},
  {id:"request_info",label:"Request more information"},
  {id:"defer",label:"Answer later"},
  {id:"talk",label:"Let’s talk soon"},
  {id:"delegate",label:"Delegate"},
];

export default function ExecutiveDecisionQueue() {
  const submission=useRef<{ fingerprint:string; key:string }|null>(null);
  const [items,setItems]=useState<ExecutiveDecision[]>([]);
  const [index,setIndex]=useState(0);
  const [method,setMethod]=useState<ReplyMethod>("choice");
  const [choiceId,setChoiceId]=useState("");
  const [reply,setReply]=useState("");
  const [deferUntil,setDeferUntil]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [delegates,setDelegates]=useState<DelegateOption[]>([]);
  const [delegatesLoading,setDelegatesLoading]=useState(false);
  const [delegateId,setDelegateId]=useState("");
  const [delegationMode,setDelegationMode]=useState<DelegationMode>("request_input");
  const [delegateInstructions,setDelegateInstructions]=useState("");
  const [delegateDueAt,setDelegateDueAt]=useState("");
  const [authorityAcknowledged,setAuthorityAcknowledged]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/exec/decisions",{signal:controller.signal,credentials:"same-origin",cache:"no-store"})
      .then(async r=>{if(!r.ok)throw Error("Executive access has not been enabled"); return r.json()})
      .then(data=>setItems(Array.isArray(data.decisions)?data.decisions:[]))
      .catch(e=>{if(!controller.signal.aborted)setNotice(e instanceof Error?e.message:"Could not load decisions")})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(method!=="delegate") return;
    const controller=new AbortController();setDelegatesLoading(true);
    void fetch("/api/exec/delegates",{signal:controller.signal,credentials:"same-origin",cache:"no-store"})
      .then(async r=>{if(!r.ok)throw Error("Delegate directory is not available");return r.json()})
      .then(data=>setDelegates(Array.isArray(data.delegates)?data.delegates:[]))
      .catch(e=>{if(!controller.signal.aborted)setNotice(e instanceof Error?e.message:"Could not load delegates")})
      .finally(()=>{if(!controller.signal.aborted)setDelegatesLoading(false)});
    return ()=>controller.abort();
  },[method]);
  const selectedDelegate=delegates.find(d=>d.id===delegateId);
  const current=items[index];
  async function send() {
    if(!current||busy) return;
    if(method==="video"||method==="voice") {
      setNotice("A verified private media-upload integration is required before recording can be sent.");return;
    }
    if(method==="delegate") {
      if(!selectedDelegate||!selectedDelegate.allowedModes.includes(delegationMode)) {
        setNotice("Select an authorized delegate and permitted delegation type.");return;
      }
      if(delegationMode!=="request_input" && (!authorityAcknowledged || !delegateInstructions.trim())) {
        setNotice("Describe the authority or approved work, then confirm the transfer.");return;
      }
    }
    const payload:DecisionAnswerPayload={expectedVersion:current.version,idempotencyKey:"",method};
    if(method==="choice")payload.choiceId=choiceId;
    if(method==="typed"||method==="request_info")payload.text=reply.trim();
    if(method==="defer") {
      const when=Date.parse(deferUntil);
      if(!Number.isFinite(when)||when<=Date.now()){setNotice("Choose a future time.");return;}
      payload.deferUntil=new Date(when).toISOString();
    }
    if(method==="talk")payload.text="Executive requests a conversation. EA to propose times.";
    if(method==="delegate") {
      payload.delegateToUserId=delegateId;payload.delegationMode=delegationMode;
      payload.delegationInstructions=delegateInstructions.trim();
      if(delegateDueAt) {
        const due=Date.parse(delegateDueAt);
        if(!Number.isFinite(due)||due<=Date.now()){setNotice("Choose a future due date.");return;}
        payload.delegationDueAt=new Date(due).toISOString();
      }
      payload.authorityAcknowledged=authorityAcknowledged;
    }
    if(method==="choice"&&!payload.choiceId) {setNotice("Choose an answer first.");return;}
    const fingerprint=JSON.stringify({...payload,idempotencyKey:undefined,decisionId:current.id});
    if(!submission.current||submission.current.fingerprint!==fingerprint) {
      submission.current={fingerprint,key:crypto.randomUUID()};
    }
    payload.idempotencyKey=submission.current.key;
    setBusy(true);setNotice("");
    try {
      const response=await fetch(`/api/exec/decisions/${encodeURIComponent(current.id)}/respond`,{
        method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(payload),
      });
      if(!response.ok)throw Error(response.status===409?"Question changed. Refresh before answering.":"Could not save. Please retry.");
      submission.current=null;
      setItems(existing=>existing.filter(d=>d.id!==current.id));setIndex(0);setMethod("choice");
      setChoiceId("");setReply("");setDeferUntil("");setDelegateId("");
      setDelegationMode("request_input");setDelegateInstructions("");setAuthorityAcknowledged(false);
      setNotice(method==="delegate"?"Delegation request saved for authorized delivery; the recipient has not been notified by this module.":"Response recorded for EA review; no external action was taken.");
    } catch(e){setNotice(e instanceof Error?e.message:"Could not save");}finally{setBusy(false)}
  }
  return <main className="execqueue-screen">
    <header className="execqueue-header"><span className="execqueue-brand">Anya <small>by Lissa</small></span><span className="execqueue-flag">EXECUTIVE PORTAL</span></header>
    <section className="execqueue-panel" aria-label="Decision Queue">
      <p className="execqueue-overline">DECISION QUEUE</p>
      {loading?<p>Loading your decisions…</p>:!current?<div><h1>All caught up</h1><p>No open decisions are available.</p></div>:
      <>
        <div className="execqueue-progress">Question {index+1} of {items.length}{current.dueAt?` · Due ${new Date(current.dueAt).toLocaleString()}`:""}</div>
        <h1>{current.title}</h1><p className="execqueue-question">{current.question}</p>
        {current.context?<details className="execqueue-details"><summary>Background and documents</summary><p>{current.context}</p></details>:null}
        {current.recommendation?<div className="execqueue-note"><strong>Chief of Staff recommendation</strong><p>{current.recommendation}</p></div>:null}
        <label className="execqueue-label" htmlFor="execanswer">Your response</label>
        <select id="execanswer" className="execqueue-select" value={method} onChange={e=>{setMethod(e.target.value as ReplyMethod);setNotice("")}}>
          {ACTIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        {method==="choice"&&<fieldset className="execqueue-options"><legend>Select an answer</legend>{current.choices.map(c=><label key={c.id} className="execqueue-option"><input type="radio" name="choice" value={c.id} checked={choiceId===c.id} onChange={()=>setChoiceId(c.id)}/>{c.label}</label>)}</fieldset>}
        {(method==="typed"||method==="request_info")&&<textarea className="execqueue-textarea" placeholder={method==="request_info"?"What additional information do you need?":"Write your response"} value={reply} onChange={e=>setReply(e.target.value)} maxLength={5000}/>}
        {method==="defer"&&<label className="execqueue-label">Choose a future time<input type="datetime-local" className="execqueue-select" value={deferUntil} onChange={e=>setDeferUntil(e.target.value)}/></label>}
        {(method==="voice"||method==="video")&&<ExecutiveMediaRecorder key={`${current.id}:${method}`} kind={method} />}
        {method==="talk"&&<div className="execqueue-note">Your Chief of Staff will coordinate a conversation. No calendar event is created automatically.</div>}
        {method==="delegate"&&<div className="execqueue-delegate">
          <label className="execqueue-label" htmlFor="delegate-user">Select delegate</label>
          <select id="delegate-user" className="execqueue-select" value={delegateId} onChange={e=>{
            setDelegateId(e.target.value);
            const picked=delegates.find(d=>d.id===e.target.value);
            setDelegationMode(picked?.allowedModes.includes("request_input")?"request_input":picked?.allowedModes[0]??"request_input");
            setAuthorityAcknowledged(false);
          }} disabled={delegatesLoading}>
            <option value="">{delegatesLoading?"Loading authorized delegates…":"Choose a person"}</option>
            {delegates.map(d=><option key={d.id} value={d.id}>{d.displayName}</option>)}
          </select>
          {!delegatesLoading&&delegates.length===0&&<div className="execqueue-note">No authorized delegates are configured. Ask the Chief of Staff to review access.</div>}
          {selectedDelegate&&<>
            <label className="execqueue-label" htmlFor="delegation-mode">Delegation type</label>
            <select id="delegation-mode" className="execqueue-select" value={delegationMode} onChange={e=>{
               setDelegationMode(e.target.value as DelegationMode);setAuthorityAcknowledged(false);
            }}>
              {selectedDelegate.allowedModes.includes("request_input")&&<option value="request_input">Request input — I keep decision authority</option>}
              {selectedDelegate.allowedModes.includes("delegate_decision")&&<option value="delegate_decision">Delegate decision — limited authority</option>}
              {selectedDelegate.allowedModes.includes("assign_execution")&&<option value="assign_execution">Assign execution — approved work</option>}
            </select>
            <label className="execqueue-label" htmlFor="delegate-instructions">Instructions and authority limits</label>
            <textarea id="delegate-instructions" className="execqueue-textarea" value={delegateInstructions}
              onChange={e=>setDelegateInstructions(e.target.value)} maxLength={3000}
              placeholder="What should the delegate do? What must come back for my approval?" />
            <label className="execqueue-label" htmlFor="delegate-due">Due by (optional)</label>
            <input id="delegate-due" type="datetime-local" className="execqueue-select" value={delegateDueAt}
              onChange={e=>setDelegateDueAt(e.target.value)}/>
            {delegationMode!=="request_input"&&<label className="execqueue-consent"><input type="checkbox"
              checked={authorityAcknowledged} onChange={e=>setAuthorityAcknowledged(e.target.checked)}/>
              I confirm this person has the stated limited authority or is assigned previously approved work.</label>}
            <div className="execqueue-note"><strong>Review before submitting</strong><p>
              {selectedDelegate.displayName} · {delegationMode==="request_input"?"Request input only":
                delegationMode==="delegate_decision"?"Limited decision authority":"Approved execution"}.
              Anya will record a pending delivery; it will not silently send or change another system.</p></div>
          </>}
        </div>}
        <button disabled={busy} className="execqueue-primary" onClick={()=>void send()}>{busy?"Saving…":"Submit response"}</button>
        <div className="execqueue-nav"><button onClick={()=>setIndex(Math.max(0,index-1))} disabled={index===0}>Previous</button><button onClick={()=>setIndex(Math.min(items.length-1,index+1))} disabled={index===items.length-1}>Next</button></div>
      </>}
      <p aria-live="polite" role="status" className="execqueue-status">{notice}</p>
    </section>
    <footer className="execqueue-footer">One decision at a time. No automatic external actions.</footer>
  </main>;
}
