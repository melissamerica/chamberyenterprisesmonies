"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { emptyLearningKnowledge, suggestExpense, type ExpenseSuggestion, type LearningFeedback, type LearningKnowledge } from "@/lib/expense-learning";
import type { UploadRow } from "@/lib/workspace-uploads";

export function useExpenseLearning(executiveId: string, open: boolean, revision: number) {
  const [knowledge, setKnowledge] = useState<LearningKnowledge>(emptyLearningKnowledge);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    // Never hold document intake while optional learning data loads.
    fetch(`/api/expense-learning?executiveId=${encodeURIComponent(executiveId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const value = await response.json() as LearningKnowledge & {error?:string}; if (!response.ok) throw Error(value.error); return value as LearningKnowledge; })
      .then(value => { if (!controller.signal.aborted) { setKnowledge(value); setError(""); } })
      .catch(() => { if (!controller.signal.aborted) setError("Memory is temporarily unavailable. Document processing still works."); });
    return () => controller.abort();
  }, [executiveId, open, revision]);
  async function update(change: Record<string, unknown>) {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/expense-learning", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ executiveId, ...change }) });
      const result = await response.json() as LearningKnowledge & {error?:string};
      if (!response.ok) throw Error(result.error || "The memory setting could not save.");
      setKnowledge(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The memory setting could not save."); }
    finally { setSaving(false); }
  }
  return { knowledge, error, saving, update };
}

type MemoryState = ReturnType<typeof useExpenseLearning>;
export function ExpenseMemoryPanel({ memory }: { memory: MemoryState }) {
  const { knowledge, error, saving, update } = memory;
  const activePreferences = knowledge.preferences.filter(value => value.active), activeDecisions = knowledge.decisions.filter(value => value.active);
  return <details className="rounded-lg border border-[#e2d8e8] bg-[#fcfafc] p-3 text-sm">
    <summary className="cursor-pointer font-medium text-[#684576]">Anya memory <span className="font-normal text-slate-500">· {activePreferences.length} saved category preferences · {activeDecisions.length} {activeDecisions.length===1?"decision":"decisions"}</span></summary>
    <div className="mt-4 space-y-4">
      <p className="text-xs leading-5 text-slate-600">Trip matching and document automation run as usual. Saved category preferences fill in automatically; inferred patterns stay suggestions. Memory is kept separately for each executive in this test workspace.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={knowledge.enabled} disabled={saving} onChange={event => void update({ enabled: event.target.checked })}/><span>Learn patterns from completed expense decisions<small className="mt-1 block text-xs text-slate-500">Pausing stops new background learning and inferred suggestions. Your explicitly saved preferences still work.</small></span></label>
      {error && <p role="status" className="text-xs text-amber-800">{error}</p>}
      <p className="text-xs"><a href="/Anya_Learning_Demo.zip" download className="text-[#795b88] underline underline-offset-4">Download fictional receipts to test learning</a></p>
      <section aria-label="Saved category preferences" className="space-y-2"><h3 className="text-xs font-semibold">Confirmed preferences</h3>
        {!knowledge.preferences.length && <p className="text-xs text-slate-500">None yet. You can optionally save a category when confirming an expense.</p>}
        {knowledge.preferences.map(pref => <div key={pref.id} className="rounded-md border border-slate-200 bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-xs"><strong>{pref.vendor} → {pref.category}</strong><span className="mt-1 block text-slate-500">{pref.scope === "vendor_city" ? `This vendor in ${pref.city}` : pref.scope === "trip" ? "This trip only" : "This vendor for this executive"} · {pref.active ? "Confirmed" : "Forgotten"}</span></p><Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void update({ kind: "preference", id: pref.id, active: !pref.active })}>{pref.active ? "Forget preference" : "Restore preference"}</Button></div>{pref.reason && <p className="mt-2 text-xs text-slate-500">Reason: {pref.reason}</p>}<small className="mt-2 block text-slate-400">Saved from an expense decision · {pref.recordedAt.slice(0, 10)}</small></div>)}
      </section>
      <details><summary className="cursor-pointer text-xs font-medium">Recent decision history · {knowledge.decisions.length}</summary><p className="mt-2 text-xs text-slate-500">A completed decision is evidence, not a permanent instruction. Three consistent, distinct examples are needed before a pattern is suggested.</p><div className="mt-3 space-y-2">{knowledge.decisions.slice(0, 30).map(value => <div key={value.id} className="rounded-md border border-slate-200 bg-white p-3 text-xs"><div className="flex flex-wrap items-start justify-between gap-2"><p><strong>{value.vendor || value.description}</strong><span className="mt-1 block text-slate-600">{value.action === "exclude" ? "Non-travel" : value.category} · {value.city || "City not supplied"} · {value.outcome}{!value.active && " · Forgotten"}</span></p><Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void update({ kind: "decision", id: value.id, active: !value.active })}>{value.active ? "Forget evidence" : "Restore evidence"}</Button></div><p className="mt-2 text-slate-500">{value.scope === "trip" ? "This trip only" : "Contextual evidence"}{value.tripName ? ` · ${value.tripName}` : ""}{value.reason ? ` · ${value.reason}` : ""}</p><p className="mt-1 break-words text-slate-400">{value.source} · Transaction {value.date} · Saved {value.recordedAt.slice(0, 10)}</p></div>)}</div></details>
    </div>
  </details>;
}

export function ExpenseLearningHint({ row, executiveId, knowledge, onCategory, onExclude }: { row: UploadRow; executiveId: string; knowledge: LearningKnowledge; onCategory: (category: string) => void; onExclude: () => void }) {
  const suggestion = suggestExpense(row, executiveId, knowledge);
  if (!suggestion || suggestion.status === "inferred" && suggestion.kind === "category" && suggestion.category === row.category) return null;
  return <div className="space-y-2 rounded-md border border-[#e4dce9] bg-[#faf7fc] p-3 text-xs sm:col-span-2">
    <p className="font-medium text-[#684576]">{suggestion.status === "confirmed" ? "Confirmed category preference" : suggestion.status === "conflict" ? "Past choices need context" : "Learned suggestion"}</p>
    <p className="leading-5 text-slate-600">{suggestion.explanation}</p>
    {suggestion.category && suggestion.category !== row.category && <Button type="button" variant="outline" size="sm" onClick={() => onCategory(suggestion.category!)}>Use {suggestion.category}</Button>}
    {suggestion.kind === "exclude" && <Button type="button" variant="outline" size="sm" onClick={onExclude}>Review as non-travel</Button>}
    <SuggestionSources suggestion={suggestion} knowledge={knowledge}/>
  </div>;
}

function SuggestionSources({ suggestion, knowledge }: { suggestion: ExpenseSuggestion; knowledge: LearningKnowledge }) {
  const decisions = knowledge.decisions.filter(value => suggestion.sourceIds.includes(value.id));
  const preferences = knowledge.preferences.filter(value => suggestion.sourceIds.includes(value.id));
  return <details><summary className="cursor-pointer text-[#795b88]">Why this suggestion?</summary><ul className="mt-2 space-y-2 text-slate-500">{preferences.map(value => <li key={value.id}>Explicitly saved: {value.vendor} → {value.category}, {value.recordedAt.slice(0, 10)}{value.reason ? ` · ${value.reason}` : ""}.</li>)}{decisions.slice(0, 5).map(value => <li key={value.id}>{value.vendor} · {value.city} · {value.date} → {value.action === "exclude" ? "Non-travel" : value.category}{value.reason ? ` · ${value.reason}` : ""}.</li>)}</ul></details>;
}

export function OptionalExpenseFeedback({ row, value = {}, onChange, assigning }: { row: UploadRow; value?: LearningFeedback; onChange: (value: LearningFeedback) => void; assigning: boolean }) {
  return <details className="rounded-md border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-medium">Category memory &amp; feedback <span className="font-normal text-slate-500">(optional)</span></summary><div className="mt-3 space-y-3">
    <p className="text-xs leading-5 text-slate-500">Completed decisions supply contextual evidence in the background. Save a category preference only when you want it filled in automatically next time. This does not assign future receipts to the current trip.</p>
    {assigning && <label className="flex items-start gap-2"><input type="checkbox" checked={!!value.rememberCategory} onChange={event => onChange({ ...value, rememberCategory: event.target.checked, scope: value.scope && value.scope !== "evidence" ? value.scope : "vendor_city" })}/><span>Remember {row.category} for similar expenses</span></label>}
    <div className="grid gap-1"><Label htmlFor={`learning-scope-${row.key}`}>Applies to</Label><select id={`learning-scope-${row.key}`} className="simple-select" value={value.scope ?? "evidence"} onChange={event => onChange({ ...value, scope: event.target.value as LearningFeedback["scope"], ...(event.target.value === "evidence" ? { rememberCategory: false } : {}) })}><option value="evidence">Evidence only — no permanent preference</option><option value="trip">This trip only</option><option value="vendor_city">This vendor in this city</option><option value="executive_vendor">This vendor for this executive, across cities</option></select></div>
    <div className="grid gap-1"><Label htmlFor={`learning-reason-${row.key}`}>Reason (optional)</Label><input id={`learning-reason-${row.key}`} className="simple-select" maxLength={400} value={value.reason ?? ""} placeholder="For example: client meal, personal charge, one-time exception" onChange={event => onChange({ ...value, reason: event.target.value })}/></div>
  </div></details>;
}
