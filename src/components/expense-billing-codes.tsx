
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { expenseReportData, type ExecutiveTemplates } from "@/lib/executive-profiles";
import { billingCodeText, type BillingCode, type BillingCodeSelection } from "@/lib/billing-codes";
import type { UploadTrip } from "@/lib/workspace-uploads";

export function ExpenseBillingCodes({ trip, templates, disabled, onSaved, onManageCodes, onBusyChange }: { trip: UploadTrip; templates: ExecutiveTemplates; disabled: boolean; onSaved: (trip: UploadTrip) => void; onManageCodes?: () => void; onBusyChange: (busy: boolean) => void }) {
  const [codes, setCodes] = useState<BillingCode[]>([]), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [defaultId, setDefaultId] = useState(trip.billingCode?.id ?? "");
  const [overrides, setOverrides] = useState<Record<number, string | null>>({});
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const report = expenseReportData(templates, trip);
  useEffect(() => { setDefaultId(trip.billingCode?.id ?? ""); setOverrides(Object.fromEntries(trip.items.map(item => [item.id, item.billingCode === null ? null : item.billingCode?.id ?? ""]))); }, [trip.id, trip.billingCode, trip.items]);
  async function load() {
    setError(""); setLoaded(false);
    try { const response = await fetch("/api/billing-codes", { cache: "no-store" }); const data = await response.json() as {codes?:BillingCode[];error?:string}; if (!response.ok || !Array.isArray(data.codes)) throw Error(data.error || "Billing codes could not load."); setCodes(data.codes); setLoaded(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Billing codes could not load."); }
  }
  useEffect(() => { void load(); }, []);
  const options = (saved?: BillingCodeSelection | null) => {
    const available = codes.filter(code => code.active || code.id === saved?.id);
    const linked = available.filter(code => !!trip.executiveId && code.executiveIds?.includes(trip.executiveId));
    const other = available.filter(code => !linked.includes(code));
    const option = (code: BillingCode) => <option key={code.id} value={code.id}>{billingCodeText(code.id === saved?.id ? saved : code)}{!code.active ? " (archived)" : ""}</option>;
    return <>{linked.length > 0 ? <><optgroup label="Linked to this executive">{linked.map(option)}</optgroup>{other.length > 0 && <optgroup label="Other codes">{other.map(option)}</optgroup>}</> : other.map(option)}{saved && !codes.some(code => code.id === saved.id) && <option value={saved.id}>{billingCodeText(saved)} (saved)</option>}</>;
  };
  async function save() {
    setBusy(true); onBusyChange(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/billing-codes/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip, defaultCodeId: defaultId, overrides: report.items.map(item => ({ itemId: item.id, codeId: overrides[item.id!] === null ? null : overrides[item.id!] ?? "" })) }) });
      const data = await response.json() as {trip?:UploadTrip;error?:string}; if (!response.ok || !data.trip) throw Error(data.error || "Billing codes could not save.");
      onSaved(data.trip); setNotice("Billing codes saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Billing codes could not save."); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <section aria-label="Expense billing codes" className="app-chrome mb-5 rounded-md border border-slate-200 bg-white p-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Billing codes</h2>{onManageCodes && <Button size="sm" variant="link" disabled={busy || disabled} onClick={onManageCodes}>Manage billing codes</Button>}</div>
    <p className="mt-1 text-slate-600">The report default applies unless an expense has its own code.</p>
    <fieldset disabled={disabled || busy || !loaded} className="mt-4 space-y-4">
      <div className="grid gap-2 sm:max-w-lg"><Label htmlFor={`report-billing-${trip.id}`}>Report default</Label><select id={`report-billing-${trip.id}`} className="simple-select w-full" value={defaultId} onChange={event => setDefaultId(event.target.value)}><option value="">No default billing code</option>{options(trip.billingCode)}</select></div>
      {!!report.items.length && <details><summary className="w-fit cursor-pointer font-medium">Individual expense codes</summary><div className="mt-3 space-y-3">{report.items.map(item => <label key={item.id} className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><span className="min-w-0 break-words">{item.expenseDescription ?? item.title}{typeof item.cost === "number" && <span className="ml-2 text-slate-500">${item.cost.toFixed(2)}</span>}</span><select className="simple-select w-full min-w-0" aria-label={`Billing code for ${item.title}`} value={overrides[item.id!] === null ? "__none__" : overrides[item.id!] ?? ""} onChange={event => setOverrides(current => ({ ...current, [item.id!]: event.target.value === "__none__" ? null : event.target.value }))}><option value="">Use report default</option><option value="__none__">No billing code</option>{options(item.billingCode)}</select></label>)}</div></details>}
      <Button type="button" onClick={() => void save()}>{busy ? "Saving…" : "Save billing codes"}</Button>
    </fieldset>
    {loaded && !codes.some(code => code.active) && <p className="mt-3 text-slate-600">Create an active code in Manage billing codes to assign it here.</p>}
    {error && <p role="alert" className="mt-3 text-red-700">{error}{!loaded && <Button variant="link" onClick={() => void load()}>Retry</Button>}</p>}
    {notice && <p role="status" className="mt-3 text-emerald-800">{notice}</p>}
  </section>;
}
