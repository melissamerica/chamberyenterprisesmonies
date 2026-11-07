import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { recognizeUpload } from "../../src/lib/automatic-upload";
import { parseLabeledConfirmation, type TravelEntry } from "../../src/lib/travel-confirmations";
import { expenseRows } from "../../src/lib/workspace-uploads";
import { defaultTemplates, expenseCategories, itineraryDays } from "../../src/lib/executive-profiles";
import { buildExpenseWorkbook, buildItineraryDocument, downloadOutput } from "../../src/lib/travel-exports";
import {
  duplicateReason, expenseEntry, expenseSummary, sampleTrip,
  tripForExpense, tripFromConfirmation, type ExpenseDraft, type MiniTrip,
} from "./core";
import "./style.css";

type CommonReview = {
  fileName: string;
  target: string;
  name: string;
  traveler: string;
  route: string;
  dates: string;
  duplicateAcknowledged: boolean;
};
type Pending = (CommonReview & { kind: "travel"; items: TravelEntry[] }) |
  (CommonReview & { kind: "expense"; drafts: ExpenseDraft[] });

const STORAGE_KEY = "chambery-travel-desk-mini-v1";
function restore(): MiniTrip[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(data) && data.every(t => t && typeof t.id === "number" && typeof t.name === "string" && Array.isArray(t.items))) return data as MiniTrip[];
  } catch { /* no browser storage or invalid saved data */ }
  return [];
}
function money(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "Amount missing";
}
function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
}
function inputAmount(value: string) {
  const cleaned = value.replace(/[$,]/g, "").trim();
  if (!cleaned) return undefined;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : undefined;
}

function TravelDesk() {
  const [trips, setTrips] = useState<MiniTrip[]>(restore);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "xlsx" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const sequence = useRef(Date.now());
  const nextId = () => ++sequence.current;
  const activeTrip = trips.find(t => t.id === activeId) || null;
  const targetTrip = trips.find(t => String(t.id) === pending?.target);
  const summary = useMemo(() => activeTrip ? expenseSummary(activeTrip) : null, [activeTrip]);
  const days = useMemo(() => activeTrip ? itineraryDays(defaultTemplates, activeTrip) : [], [activeTrip]);
  const warningItems: TravelEntry[] = pending?.kind === "travel" ? pending.items :
    pending?.kind === "expense" ? pending.drafts.map((d, i) => expenseEntry(d, -10000 - i)) : [];
  const warnings = warningItems.flatMap((item, index) => {
    const reason = duplicateReason([...(targetTrip?.items || []), ...warningItems.slice(0, index)], item);
    return reason ? ["Line " + (index + 1) + ": " + reason] : [];
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trips)); }
    catch { setNotice("Local browser storage is unavailable. Download your output before leaving."); }
  }, [trips]);
  useEffect(() => {
    if (trips.length && !trips.some(t => t.id === activeId)) setActiveId(trips[0].id);
    if (!trips.length && activeId !== null) setActiveId(null);
  }, [activeId, trips]);

  async function readFile(file?: File) {
    if (!file || busy || pending) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await recognizeUpload(file);
      if (!result.text || result.warning) throw Error(result.warning || "No readable text was detected.");
      const text = result.text;
      if (result.kind === "travel") {
        const parsed = parseLabeledConfirmation(text, file.name, nextId());
        if (!parsed) throw Error("Travel document recognized but booking facts were incomplete. Nothing was added. Use a clearer confirmation.");
        setPending({
          kind: "travel", fileName: file.name, items: parsed.items,
          target: "new", name: parsed.name, traveler: parsed.traveler,
          route: parsed.route, dates: parsed.dates, duplicateAcknowledged: false,
        });
        setNotice("Travel confirmation recognized. Check the booking facts and select its trip.");
      } else if (result.kind === "expenses") {
        const rows = expenseRows(text, { id: String(nextId()), name: file.name });
        if (rows.some(row => row.evidenceKind === "statement")) {
          throw Error("Credit-card statement reconciliation is outside this first mini-tool version. Nothing was imported.");
        }
        const drafts: ExpenseDraft[] = rows.map(row => ({
          title: row.title, date: row.date, amount: row.amount, category: row.category,
          source: file.name, detail: row.detail, evidenceKind: row.evidenceKind,
        }));
        setPending({
          kind: "expense", fileName: file.name, drafts,
          target: activeTrip ? String(activeTrip.id) : "new",
          name: activeTrip?.name || "", traveler: activeTrip?.traveler || "",
          route: "", dates: "", duplicateAcknowledged: false,
        });
        setNotice("Receipt information recognized. Correct any missing fields before importing.");
      } else {
        throw Error(result.kind === "review"
          ? "This file needs closer review; the reader cannot safely extract its facts. Nothing was imported."
          : "This file is not a supported booking confirmation or receipt in the first mini-tool.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be read.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function startManualExpense() {
    setError(""); setNotice("");
    setPending({
      kind: "expense", fileName: "Manual expense", target: activeTrip ? String(activeTrip.id) : "new",
      name: activeTrip?.name || "", traveler: activeTrip?.traveler || "",
      route: "", dates: "", duplicateAcknowledged: false,
      drafts: [{ title: "", date: "", amount: "", category: "Misc.", source: "Manual entry" }],
    });
  }

  function updateCommon(change: Partial<CommonReview>) {
    setPending(p => p ? { ...p, ...change, duplicateAcknowledged: false } : p);
  }
  function updateTravel(index: number, change: Partial<TravelEntry>) {
    setPending(p => p?.kind === "travel"
      ? { ...p, duplicateAcknowledged: false, items: p.items.map((item, i) => i === index ? { ...item, ...change } : item) }
      : p);
  }
  function updateExpense(index: number, change: Partial<ExpenseDraft>) {
    setPending(p => p?.kind === "expense"
      ? { ...p, duplicateAcknowledged: false, drafts: p.drafts.map((draft, i) => i === index ? { ...draft, ...change } : draft) }
      : p);
  }

  function confirmImport() {
    if (!pending) return;
    setError("");
    if (pending.target === "new" && (!pending.name.trim() || !pending.traveler.trim())) {
      setError("Enter a trip name and traveler before saving.");
      return;
    }
    if (warnings.length && !pending.duplicateAcknowledged) {
      setError("Review and acknowledge the potential duplicates before importing.");
      return;
    }
    const items = pending.kind === "travel" ? pending.items :
      pending.drafts.map(draft => expenseEntry(draft, nextId()));
    if (!items.length || items.some(i => !i.title.trim())) {
      setError("Each entry needs a description.");
      return;
    }
    if (items.some(i => i.cost != null && !Number.isFinite(i.cost))) {
      setError("One or more amounts are invalid.");
      return;
    }
    let id: number;
    if (pending.target === "new") {
      id = nextId();
      const trip = pending.kind === "travel"
        ? tripFromConfirmation({ name: pending.name, traveler: pending.traveler, route: pending.route, dates: pending.dates, items: [] }, id)
        : tripForExpense(id, pending.name, pending.traveler);
      setTrips(current => [...current, { ...trip, items }]);
    } else {
      id = Number(pending.target);
      if (!trips.some(t => t.id === id)) {
        setError("Selected trip no longer exists. Choose another trip."); return;
      }
      setTrips(current => current.map(t => t.id === id ? { ...t, items: [...t.items, ...items] } : t));
    }
    setActiveId(id);
    setPending(null);
    setNotice(items.length + " reviewed record(s) added. Nothing was sent or booked.");
  }

  function removeItem(id: number) {
    if (!activeTrip || !window.confirm("Remove this record from the local trip?")) return;
    setTrips(current => current.map(t => t.id === activeTrip.id
      ? { ...t, items: t.items.filter(item => item.id !== id) } : t));
  }

  async function exportFile(type: "docx" | "xlsx") {
    if (!activeTrip || exporting) return;
    setExporting(type); setError("");
    try {
      const filename = safeName(activeTrip.name);
      if (type === "docx") {
        if (!activeTrip.items.some(i => i.kind !== "Expense" && i.itineraryEligible !== false)) {
          throw Error("Add a travel booking before generating an itinerary.");
        }
        const file = await buildItineraryDocument(defaultTemplates, activeTrip);
        downloadOutput(file, filename + "-itinerary.docx");
      } else {
        const bytes = await buildExpenseWorkbook(defaultTemplates, activeTrip);
        const file = new Blob([new Uint8Array(bytes as ArrayBuffer)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        downloadOutput(file, filename + "-expenses.xlsx");
      }
      setNotice("Generated " + type.toUpperCase() + " output locally; no external service used.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Document export failed.");
    } finally { setExporting(null); }
  }

  function loadSample() {
    setTrips(current => current.some(t => t.id === sampleTrip.id)
      ? current : [...current, structuredClone(sampleTrip)]);
    setActiveId(sampleTrip.id);
    setNotice("Fictional sample loaded. Existing local trips were preserved.");
  }
  function reset() {
    if (!window.confirm("Permanently clear all Travel Desk trips stored in this browser?")) return;
    setTrips([]); setActiveId(null); setPending(null); setNotice("Local Travel Desk data cleared.");
  }

  return <div className="shell">
    <header className="header">
      <div><div className="wordmark">Chambery<span>.</span></div><div className="brand-sub">ENTERPRISES / EXECOS</div></div>
      <div className="header-right"><span className="demo-tag">LOCAL WORKING PROTOTYPE</span><span>Travel Desk / V1</span></div>
    </header>
    <main className="container">
      <div className="intro">
        <div><p className="eyebrow">AN ADMINISTRATIVE AUTOMATION MINI-TOOL</p><h1>Travel, without the busywork.</h1>
          <p>Drop a confirmation or receipt. Review the extracted details. Produce an organized travel itinerary and Excel expense report.</p></div>
        <button className="quiet-button" onClick={loadSample}>Load fictional sample trip</button>
      </div>
      <div className="status-line"><span>Browser-local records only</span><span>No email, booking or calendar connections</span><span>Review before saving</span></div>
      <div className="two-col">
        <section className="panel input-panel" aria-labelledby="upload-title">
          <div className="section-top"><span className="step">01 / INTAKE</span><h2 id="upload-title">Your documents</h2></div>
          <div className={"dropzone" + (busy ? " is-busy" : "")}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length > 1) setNotice("Importing the first file only; each file needs its own review."); void readFile(e.dataTransfer.files[0]); }}>
            <div className="drop-icon" aria-hidden="true">↥</div>
            <strong>{busy ? "Reading your document…" : "Drop a travel document here"}</strong>
            <p>Flight · Hotel · Car · Receipt</p>
            <p className="micro">PDF, photos or text • one file at a time • up to 20 MB</p>
            <input ref={fileInput} type="file" aria-label="Choose a travel confirmation or receipt" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.eml,.html,.htm,image/*" className="sr-only" onChange={e => void readFile(e.target.files?.[0])} />
            <button type="button" className="button button-primary" disabled={busy || !!pending} onClick={() => fileInput.current?.click()}>Choose a file</button>
          </div>
          <button className="link-button" disabled={!!pending || busy} onClick={startManualExpense}>+ Enter an expense manually</button>
          <p className="help">Anya's existing document readers power this prototype. Original files aren't uploaded to a server or retained after review.</p>
        </section>
        <section className="panel trip-panel">
          <div className="section-top"><span className="step">02 / ORGANIZE</span><h2>Trip workspace</h2></div>
          <label className="field">Selected trip
            <select value={activeId === null ? "" : String(activeId)} onChange={e => setActiveId(e.target.value ? Number(e.target.value) : null)} disabled={!trips.length}>
              {trips.length ? trips.map(t => <option key={t.id} value={t.id}>{t.name} · {t.traveler}</option>) : <option value="">No trips yet</option>}
            </select>
          </label>
          {activeTrip ? <div className="trip-card">
            <h3>{activeTrip.name}</h3><p>{activeTrip.traveler}</p>
            <dl><div><dt>Dates</dt><dd>{activeTrip.dates || "Not specified"}</dd></div><div><dt>Route</dt><dd>{activeTrip.route || "Not specified"}</dd></div><div><dt>Records</dt><dd>{activeTrip.items.length}</dd></div></dl>
          </div> : <div className="empty">Your first reviewed confirmation creates a trip. You can also load the fictional example.</div>}
          <div className="mini-stats"><div><strong>{summary ? money(summary.knownTotal) : "$0.00"}</strong><small>Known expenses</small></div><div><strong>{summary?.missing ?? 0}</strong><small>Missing amounts</small></div></div>
        </section>
      </div>

      {(notice || error) && <div className={"alert " + (error ? "alert-error" : "alert-ok")} role={error ? "alert" : "status"}>{error || notice}</div>}

      {pending && <section className="panel review-panel" aria-labelledby="review-title">
        <div className="review-head"><div><span className="step">REVIEW REQUIRED</span><h2 id="review-title">{pending.kind === "travel" ? "Verify booking details" : "Verify expense details"}</h2><p>Source: {pending.fileName} · Nothing is saved until you confirm.</p></div>
          <button className="quiet-button" onClick={() => { setPending(null); setError(""); }}>Skip document</button>
        </div>
        <div className="review-grid">
          <label className="field">Assign to trip
            <select value={pending.target} onChange={e => updateCommon({ target: e.target.value })}>
              <option value="new">Create a new trip</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.name} / {t.traveler}</option>)}
            </select>
          </label>
          {pending.target === "new" && <>
            <label className="field">Trip name<input value={pending.name} onChange={e => updateCommon({ name: e.target.value })} placeholder="e.g. Denver conference" /></label>
            <label className="field">Traveler<input value={pending.traveler} onChange={e => updateCommon({ traveler: e.target.value })} placeholder="Traveler name" /></label>
            {pending.kind === "travel" && <>
              <label className="field">Route<input value={pending.route} onChange={e => updateCommon({ route: e.target.value })} /></label>
              <label className="field">Dates<input value={pending.dates} onChange={e => updateCommon({ dates: e.target.value })} /></label>
            </>}
          </>}
        </div>
        {pending.kind === "travel" ? <div className="review-items">
          {pending.items.map((item, index) => <article key={index} className="review-item">
            <span className="pill">{item.kind} · {index + 1}</span>
            <div className="review-grid">
              <label className="field">Reservation / title<input value={item.title} onChange={e => updateTravel(index, { title: e.target.value })} /></label>
              <label className="field">Amount ($) <input type="number" step="0.01" value={item.cost ?? ""} onChange={e => updateTravel(index, { cost: inputAmount(e.target.value) })} /></label>
              <label className="field">Location<input value={item.location || ""} onChange={e => updateTravel(index, { location: e.target.value })} /></label>
              <label className="field">Confirmation / details<input value={item.detail} onChange={e => updateTravel(index, { detail: e.target.value })} /></label>
            </div>
            <p className="micro">{item.date} · {item.time} · {item.start || "Start unknown"} → {item.end || "End unknown"}</p>
            <p className="micro">Verify the date and time against the original confirmation. Re-upload corrected source if those instants are wrong.</p>
          </article>)}
        </div> : <div className="review-items">
          {pending.drafts.map((draft, index) => <article key={index} className="review-item">
            <span className="pill">Expense · {index + 1}</span>
            <div className="review-grid">
              <label className="field">Merchant / description<input value={draft.title} onChange={e => updateExpense(index, { title: e.target.value })} /></label>
              <label className="field">Date<input type="date" value={draft.date} onChange={e => updateExpense(index, { date: e.target.value })} /></label>
              <label className="field">Amount ($) <input type="number" step="0.01" placeholder="Leave blank if unknown" value={draft.amount} onChange={e => updateExpense(index, { amount: e.target.value })} /></label>
              <label className="field">Category
                <select value={draft.category} onChange={e => updateExpense(index, { category: e.target.value })}>
                  {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </label>
            </div>
          </article>)}
        </div>}
        {!!warnings.length && <div className="duplicate-note">
          <strong>Potential duplicate records</strong>
          {warnings.map((warning, index) => <p key={index}>{warning}</p>)}
          <label><input type="checkbox" checked={pending.duplicateAcknowledged} onChange={e => setPending(p => p ? { ...p, duplicateAcknowledged: e.target.checked } : p)} /> I reviewed these warnings and want to import anyway.</label>
        </div>}
        <div className="review-actions"><button className="button button-muted" onClick={() => setPending(null)}>Cancel</button><button className="button button-primary" onClick={confirmImport}>Confirm and add to trip</button></div>
      </section>}

      <div className="two-col output-area">
        <section className="panel">
          <div className="section-top"><span className="step">03 / GENERATE</span><h2>Travel itinerary</h2><p>Chronological booking preview</p></div>
          {days.length ? days.map((day, index) => <div className="itinerary-day" key={index}>
            <h3>{day.label}</h3>
            {day.rows.map((row, idx) => <div className="itinerary-row" key={idx}><b>{row.time}</b><div><strong>{row.title}</strong><p>{row.body}</p></div></div>)}
          </div>) : <div className="empty">No travel reservations to display.</div>}
          <button className="button button-primary wide" disabled={!activeTrip || !!exporting || !days.length} onClick={() => void exportFile("docx")}>{exporting === "docx" ? "Generating…" : "Download Word itinerary (.docx)"}</button>
        </section>
        <section className="panel">
          <div className="section-top"><span className="step">04 / REPORT</span><h2>Expense report</h2><p>Known amounts only; missing values stay visible</p></div>
          <div className="expenses">
            {activeTrip?.items.filter(i => i.kind !== "Appointment" && i.expenseEligible !== false && (i.source || i.cost != null)).map(item =>
              <div className="expense-row" key={item.id}>
                <div><b>{item.expenseDescription || item.title}</b><span>{item.expenseDate || item.date} · {item.expenseCategory || item.kind}</span></div>
                <div className="expense-actions"><strong>{money(item.cost)}</strong><button aria-label={"Remove " + item.title} onClick={() => removeItem(item.id)}>Remove</button></div>
              </div>)}
          </div>
          {!summary?.count && <div className="empty">No expenses to display.</div>}
          <div className="expense-total"><span>{summary?.missing ? "Known total (excludes missing)" : "Total"}</span><strong>{money(summary?.knownTotal ?? 0)}</strong></div>
          <button className="button button-primary wide" disabled={!activeTrip || !!exporting || !summary?.count} onClick={() => void exportFile("xlsx")}>{exporting === "xlsx" ? "Generating…" : "Download Excel report (.xlsx)"}</button>
        </section>
      </div>
      <footer><span>Chambery Enterprises · Travel Desk · Working portfolio prototype</span><button className="link-button" onClick={reset}>Clear local data</button></footer>
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<TravelDesk />);
