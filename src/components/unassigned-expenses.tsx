import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UnassignedUpload } from "@/lib/workspace-uploads";

export function UnassignedExpenses({receipts,executives,loading,error,onRetry,onReview,onBack}:{receipts:UnassignedUpload[];executives:Array<{id:string;name:string}>;loading:boolean;error:string;onRetry:()=>void;onReview:(receipt:UnassignedUpload)=>void;onBack:()=>void}) {
  const [from,setFrom]=useState("");const [to,setTo]=useState("");
  const invalid=!!from&&!!to&&from>to;
  const visible=invalid?[]:receipts.filter(value=>(!from||!!value.row.date&&value.row.date>=from)&&(!to||!!value.row.date&&value.row.date<=to));
  return <main className="min-h-screen bg-white px-5 py-10 text-slate-900 sm:px-8 sm:py-16"><div className="mx-auto max-w-4xl">
    <button type="button" className="mb-6 text-sm font-medium text-[#6b3f78] underline underline-offset-4" onClick={onBack}>Back to expenses</button>
    <h1 className="text-3xl font-semibold tracking-tight text-[#56315f]">Unassigned expenses</h1>
    <p className="mt-2 text-sm text-slate-600">All executives and trips · Oldest receipt first</p>
    <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-2"><Label htmlFor="unassigned-from">From date</Label><Input id="unassigned-from" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></div>
      <div className="grid gap-2"><Label htmlFor="unassigned-to">To date</Label><Input id="unassigned-to" type="date" value={to} min={from||undefined} onChange={event=>setTo(event.target.value)}/></div>
      <Button type="button" variant="outline" disabled={!from&&!to} onClick={()=>{setFrom("");setTo("");}}>Clear dates</Button>
    </div>
    {invalid&&<p role="alert" className="mt-3 text-sm text-red-700">The end date must be on or after the start date.</p>}
    {error&&<div role="alert" className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}<Button variant="ghost" size="sm" disabled={loading} onClick={onRetry}>Retry</Button></div>}
    {loading?<p role="status" className="mt-8 text-slate-600">Loading unassigned receipts…</p>:!error&&<>
      <p role="status" className="mt-5 text-sm text-slate-600">Showing {visible.length} of {receipts.length} unassigned {receipts.length===1?"receipt":"receipts"}</p>
      <div className="mt-4 space-y-4">{visible.map(receipt=>{const row=receipt.row,name=executives.find(value=>value.id===receipt.executiveId)?.name||receipt.executiveName||"Executive";return <article key={row.key} className="rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{row.title||"Description needed"}</h2><p className="mt-1 text-sm text-slate-600">{name} · {row.date||"Date needed"}{row.location?` · ${row.location}`:""}</p></div><p className="font-medium">{row.amount.trim()&&Number.isFinite(Number(row.amount))?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(row.amount)):"Amount needed"}</p></div>
        <p className="mt-3 text-sm text-red-700">{row.exclusionReason||row.match||"Choose how to handle this transaction."}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><a className="break-all text-sm text-[#6b3f78] underline" href={`/api/uploads/${encodeURIComponent(row.fileId)}`} target="_blank" rel="noreferrer">{row.source}</a><Button type="button" variant="outline" onClick={()=>onReview(receipt)}>Review receipt</Button></div>
      </article>;})}</div>
      {!visible.length&&!invalid&&<p className="mt-8 text-slate-600">{receipts.length?"No unassigned receipts match these dates.":"No unassigned receipts."}</p>}
      {!!receipts.some(value=>!value.row.date)&&(!!from||!!to)&&<p className="mt-4 text-sm text-slate-600">Receipts without a date appear when date filters are cleared.</p>}
    </>}
  </div></main>;
}
