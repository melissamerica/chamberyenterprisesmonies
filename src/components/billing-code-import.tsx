
import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillingCode } from "@/lib/billing-codes";
import { billingCodeKey, billingImportIssue, billingImportRows, guessBillingColumns, readBillingCodeFile, type BillingImportMapping, type BillingImportRow, type BillingImportSheet } from "@/lib/billing-code-import";

export function BillingCodeImport({codes, executives, disabled, onBusyChange, onImported, initialFile}: {initialFile?: File; codes: BillingCode[]; executives: Array<{id: string; name: string}>; disabled: boolean; onBusyChange: (busy: boolean) => void; onImported: (codes: BillingCode[], notice: string) => void}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const intakeRead = useRef<File | null>(null);
  useEffect(() => { if (initialFile && !disabled && intakeRead.current !== initialFile) { intakeRead.current = initialFile; void read(initialFile); } }, [initialFile, disabled]);
  const [sheets, setSheets] = useState<BillingImportSheet[]>([]), [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<BillingImportMapping>({headerRow: -1, codeColumn: 0, labelColumn: 1});
  const [rows, setRows] = useState<BillingImportRow[]>([]), [filename, setFilename] = useState("");
  const [executiveIds, setExecutiveIds] = useState<string[]>([]), [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const known = new Map(codes.map(code => [billingCodeKey(code.code), code]));
  const selected = rows.filter(row => row.selected);
  const selectedKeys = new Map<string, number>();
  for (const row of selected) selectedKeys.set(billingCodeKey(row.code), (selectedKeys.get(billingCodeKey(row.code)) ?? 0) + 1);
  const issue = (row: BillingImportRow) => billingImportIssue(row) || (row.selected && (selectedKeys.get(billingCodeKey(row.code)) ?? 0) > 1 ? "Selected more than once" : "");
  const invalid = selected.some(row => !!issue(row));
  function working(message: string) { setBusy(message); onBusyChange(!!message); }
  function configure(index: number, value: BillingImportMapping, source = sheets) {
    setSheetIndex(index); setMapping(value); setError("");
    try { setRows(billingImportRows(source[index].rows, value, codes)); }
    catch (reason) { setRows([]); setError(reason instanceof Error ? reason.message : "The code list could not be read."); }
  }
  async function read(file: File) {
    if (disabled || busy) return;
    working("Reading file…"); setError(""); setRows([]); setSheets([]); setFilename(file.name);
    try { const result = await readBillingCodeFile(file); setSheets(result); configure(0, guessBillingColumns(result[0].rows), result); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "This file could not be read. Try an Excel or CSV copy."); }
    finally { working(""); }
  }
  function edit(key: number, change: Partial<BillingImportRow>) { setRows(current => current.map(row => row.key === key ? {...row, ...change} : row)); setError(""); }
  function cancel() { setRows([]); setSheets([]); setFilename(""); setError(""); setExecutiveIds([]); }
  async function save() {
    if (disabled || busy || !selected.length || invalid) return;
    working("Importing codes…"); setError("");
    try {
      const response = await fetch("/api/billing-codes/import", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({rows: selected.map(row => ({code: row.code.trim(), label: row.label.trim(), expectedUpdatedAt: known.get(billingCodeKey(row.code))?.updatedAt})), executiveIds})});
      const result = await response.json() as {codes?: BillingCode[]; added?: number; updated?: number; error?: string};
      if (!response.ok || !Array.isArray(result.codes)) throw Error(result.error || "The codes could not be imported.");
      onImported(result.codes, `Import complete: ${result.added ?? 0} added, ${result.updated ?? 0} updated. Existing executive links preserved.`); cancel();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The import could not save. Your review is still here."); }
    finally { working(""); }
  }
  const sheet = sheets[sheetIndex];
  const columnCount = sheet ? Math.max(2, ...sheet.rows.map(row => row.length)) : 2;
  const columnOptions = Array.from({length: columnCount}, (_, index) => <option key={index} value={index}>{mapping.headerRow >= 0 ? sheet?.rows[mapping.headerRow]?.[index] || `Column ${index + 1}` : `Column ${index + 1}`}</option>);
  const locked = disabled || !!busy;
  const validKeys = new Set<string>();
  const selectable = rows.filter(row => {const key = billingCodeKey(row.code); if (billingImportIssue(row) || validKeys.has(key)) return false; validKeys.add(key); return true;});
  const allSelected = selectable.length > 0 && selectable.every(row => row.selected);
  return <section aria-label="Upload billing codes" className="mt-7 rounded-md border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">Upload billing codes</h2><p className="mt-1 text-sm text-slate-600">Import an existing code list, then review it before saving.</p></div><Button variant="outline" disabled={locked} onClick={() => fileInput.current?.click()}><Upload className="mr-2 size-4" />Choose file</Button></div>
    <p className="mt-3 text-sm text-slate-600">Excel (.xlsx), CSV/TSV, Word (.docx), PDF, or text · Up to 20 MB. Older .xls or .doc files must be saved in one of these formats.</p>
    <input ref={fileInput} type="file" accept=".xlsx,.csv,.tsv,.docx,.pdf,.txt" className="hidden" aria-label="Upload a billing-code list" disabled={locked} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void read(file); }} />
    {busy && <p role="status" className="mt-4 text-sm text-slate-600">{busy}</p>}
    {sheet && <div className="mt-5 space-y-5">
      <p className="break-words text-sm font-medium">{filename}</p>
      <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
        {sheets.length > 1 && <div className="grid gap-2"><Label htmlFor="billing-import-sheet">Worksheet</Label><select id="billing-import-sheet" className="simple-select w-full" value={sheetIndex} onChange={event => { const index = Number(event.target.value); configure(index, guessBillingColumns(sheets[index].rows)); }}>{sheets.map((value, index) => <option key={index} value={index}>{value.name}</option>)}</select></div>}
        <div className="grid gap-2"><Label htmlFor="billing-import-header">Column headings</Label><select id="billing-import-header" className="simple-select w-full" value={mapping.headerRow} onChange={event => configure(sheetIndex, {...mapping, headerRow: Number(event.target.value)})}><option value={-1}>No heading row</option>{sheet.rows.slice(0, 30).map((row, index) => <option key={index} value={index}>Row {index + 1}: {row.join(" · ").slice(0, 100)}</option>)}</select></div>
        <div className="grid gap-2"><Label htmlFor="billing-import-code-column">Code column</Label><select id="billing-import-code-column" className="simple-select w-full" value={mapping.codeColumn} onChange={event => configure(sheetIndex, {...mapping, codeColumn: Number(event.target.value)})}>{columnOptions}</select></div>
        <div className="grid gap-2"><Label htmlFor="billing-import-description-column">Description column</Label><select id="billing-import-description-column" className="simple-select w-full" value={mapping.labelColumn} onChange={event => configure(sheetIndex, {...mapping, labelColumn: Number(event.target.value)})}>{columnOptions}</select></div>
      </fieldset>
      <p className="text-sm text-slate-600">New codes are selected automatically. Select an existing code only if you want to update it. Edit any extracted values below. Existing executive links and saved expense reports are preserved.</p>
      {mapping.codeColumn === mapping.labelColumn ? <p role="alert" className="text-sm text-red-700">Choose different columns for codes and descriptions.</p> : <>
        {!!rows.length && <div className="max-h-[32rem] overflow-auto rounded border border-slate-200"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3"><input aria-label="Select all valid rows" type="checkbox" disabled={locked} checked={allSelected} onChange={event => {const checked = event.target.checked, seen = new Set<string>(); setRows(current => current.map(row => { const key = billingCodeKey(row.code), selected = checked && !billingImportIssue(row) && !seen.has(key); seen.add(key); return {...row, selected}; }));}} /></th><th className="p-3">Code</th><th className="p-3">Description</th><th className="p-3">Review</th></tr></thead><tbody>{rows.map(row => {const existing = known.get(billingCodeKey(row.code)), problem = issue(row); return <tr key={row.key} className="border-t border-slate-100"><td className="p-3 align-top"><input type="checkbox" aria-label={`Import row ${row.sourceRow}`} disabled={locked} checked={row.selected} onChange={event => edit(row.key, {selected: event.target.checked})} /></td><td className="p-3 align-top"><Input aria-label={`Code, row ${row.sourceRow}`} disabled={locked} maxLength={80} value={row.code} onChange={event => edit(row.key, {code: event.target.value})} /></td><td className="p-3 align-top"><Input aria-label={`Description, row ${row.sourceRow}`} disabled={locked} maxLength={240} value={row.label} onChange={event => edit(row.key, {label: event.target.value})} /></td><td className="max-w-64 p-3 align-top text-slate-600">{problem ? <span className="text-red-700">{problem}</span> : existing ? <><span>{existing.active ? "Existing code" : "Archived code"}{row.selected ? " · will update" : " · skipped"}</span><span className="mt-1 block break-words">Current: {existing.label}</span></> : row.selected ? "New code" : "Skipped"}</td></tr>;})}</tbody></table></div>}
        {!rows.length && <p className="text-sm text-slate-600">No code rows found. Check the worksheet and column selections, or upload a clearer file.</p>}
        <fieldset disabled={locked}><details><summary className="w-fit cursor-pointer text-sm font-medium">Link imported codes to executives{executiveIds.length > 0 ? ` (${executiveIds.length} selected)` : " (optional)"}</summary><p className="mt-3 text-sm text-slate-600">These links are added to the selected codes. Existing links stay in place.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{executives.map(executive => <label key={executive.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={executiveIds.includes(executive.id)} onChange={event => setExecutiveIds(current => event.target.checked ? [...current, executive.id] : current.filter(id => id !== executive.id))} />{executive.name}</label>)}</div>{!executives.length && <p className="mt-3 text-sm text-slate-600">Create an executive to link imported codes.</p>}</details></fieldset>
      </>}
      <div className="flex flex-wrap items-center gap-3"><Button disabled={locked || !selected.length || invalid || mapping.codeColumn === mapping.labelColumn} onClick={() => void save()}>Import {selected.length} selected code{selected.length === 1 ? "" : "s"}</Button><Button variant="outline" disabled={locked} onClick={cancel}>Cancel import</Button></div>
    </div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  </section>;
}
