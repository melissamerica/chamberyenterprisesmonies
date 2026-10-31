
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillingCode } from "@/lib/billing-codes";
import { BillingCodeImport } from "@/components/billing-code-import";

type CodeDraft = { id: string; code: string; label: string; active: boolean; executiveIds: string[] };
const emptyDraft = (): CodeDraft => ({id: "", code: "", label: "", active: true, executiveIds: []});
export function BillingCodeLibrary({ onBack, returnToReport = false, executives }: { onBack: () => void; returnToReport?: boolean; executives: Array<{id: string; name: string}> }) {
  const [codes, setCodes] = useState<BillingCode[]>([]);
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const locked = busy || importBusy;
  const [draft, setDraft] = useState<CodeDraft>(emptyDraft);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  async function load() {
    setLoaded(false); setError("");
    try { const response = await fetch("/api/billing-codes", { cache: "no-store" }); const result = await response.json() as {codes?:BillingCode[];error?:string}; if (!response.ok || !Array.isArray(result.codes)) throw Error(result.error || "Billing codes could not load."); setCodes(result.codes); setLoaded(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Billing codes could not load."); }
  }
  useEffect(() => { void load(); }, []);
  async function save(value: typeof draft) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/billing-codes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, id: value.id || undefined }) });
      const result = await response.json() as {code?:BillingCode;error?:string}; if (!response.ok || !result.code) throw Error(result.error || "The billing code could not save.");
      const saved = result.code;
      setCodes(current => [...current.filter(code => code.id !== saved.id), saved].sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code)));
      setDraft(emptyDraft()); setNotice("Billing code and executive links saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "The billing code could not save."); }
    finally { setBusy(false); }
  }
  const row = (code: BillingCode) => {
    const linked = executives.filter(executive => code.executiveIds?.includes(executive.id));
    const otherCount = (code.executiveIds?.length ?? 0) - linked.length;
    const names = [...linked.map(executive => executive.name), ...(otherCount ? [`${otherCount} other executive${otherCount === 1 ? "" : "s"}`] : [])];
    return <article key={code.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-slate-200 bg-white p-4"><div className="min-w-0"><p className="break-words font-semibold">{code.code}</p><p className="mt-1 break-words text-sm text-slate-600">{code.label}</p><p className="mt-2 break-words text-sm text-slate-600">{names.length ? `Linked to: ${names.join(", ")}` : "No executives linked"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={locked} onClick={() => { setDraft({...code, executiveIds: code.executiveIds ?? []}); setError(""); setNotice(""); }}>Edit / Link executives</Button><Button size="sm" variant="ghost" disabled={locked} onClick={() => void save({ ...code, executiveIds: code.executiveIds ?? [], active: !code.active })}>{code.active ? "Archive" : "Restore"}</Button></div></article>;
  };
  return <main className="console-page min-h-screen px-5 py-10 sm:px-8 sm:py-16"><div className="mx-auto max-w-4xl">
    <Button variant="link" className="mb-5 px-0" disabled={locked} onClick={onBack}>{returnToReport ? "Back to expense report" : "Home"}</Button>
    <h1 className="text-3xl font-semibold tracking-tight">Billing codes</h1><p className="mt-2 text-sm text-slate-600">Add or update billing codes and link each code to one or more executives. Each executive can have multiple codes.</p>
    <BillingCodeImport codes={codes} executives={executives} disabled={busy || !loaded} onBusyChange={setImportBusy} onImported={(values, message) => { setCodes(values); setNotice(message); setError(""); }} />
    <form className="mt-7 rounded-md border border-slate-200 bg-white p-5" onSubmit={event => { event.preventDefault(); void save(draft); }}>
      <h2 className="mb-4 font-semibold">{draft.id ? "Edit billing code" : "Add billing code"}</h2>
      <fieldset disabled={locked || !loaded} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><div className="grid gap-2"><Label htmlFor="billing-code">Code</Label><Input id="billing-code" maxLength={80} required value={draft.code} onChange={event => setDraft(current => ({ ...current, code: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="billing-description">Description</Label><Input id="billing-description" maxLength={240} required value={draft.label} onChange={event => setDraft(current => ({ ...current, label: event.target.value }))} /></div></fieldset>
      <fieldset disabled={locked || !loaded} className="mt-5 space-y-3"><legend className="mb-2 text-sm font-medium">Link to executives</legend><p className="text-sm text-slate-600">Select any number of executives, or save the code and link it later.</p>{executives.length > 0 && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={executives.every(executive => draft.executiveIds.includes(executive.id))} onChange={event => setDraft(current => ({...current, executiveIds: event.target.checked ? Array.from(new Set([...current.executiveIds, ...executives.map(executive => executive.id)])) : []}))} />All executives</label>}<div className="grid gap-3 sm:grid-cols-2">{executives.map(executive => <label key={executive.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.executiveIds.includes(executive.id)} onChange={event => setDraft(current => ({...current, executiveIds: event.target.checked ? [...current.executiveIds, executive.id] : current.executiveIds.filter(id => id !== executive.id)}))} />{executive.name}</label>)}</div>{!executives.length && <p className="text-sm text-slate-600">Create an executive to link this code.</p>}</fieldset>
      <div className="mt-4 flex flex-wrap gap-2"><Button type="submit" disabled={locked || !loaded || !draft.code.trim() || !draft.label.trim()}>{busy ? "Saving…" : "Save billing code"}</Button>{draft.id && <Button type="button" variant="outline" disabled={locked} onClick={() => setDraft(emptyDraft())}>Cancel edit</Button>}</div>
    </form>
    {error && <div role="alert" className="mt-4 text-sm text-red-700">{error}{!loaded && <Button variant="link" onClick={() => void load()}>Retry</Button>}</div>}
    {notice && <p role="status" className="mt-4 text-sm text-emerald-800">{notice}</p>}
    {!loaded && !error && <p className="mt-6 text-sm text-slate-600">Loading billing codes…</p>}
    {loaded && <section className="mt-7 space-y-3" aria-label="Active billing codes"><h2 className="font-semibold">Active codes</h2>{codes.filter(code => code.active).map(row)}{!codes.some(code => code.active) && <p className="text-sm text-slate-600">No active billing codes. Add your first code above.</p>}</section>}
    {codes.some(code => !code.active) && <details className="mt-7"><summary className="cursor-pointer text-sm font-medium">Archived codes</summary><p className="my-3 text-sm text-slate-600">Archived codes remain on previous reports.</p><div className="space-y-3">{codes.filter(code => !code.active).map(row)}</div></details>}
  </div></main>;
}
