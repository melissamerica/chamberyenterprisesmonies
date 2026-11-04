import { useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, ClipboardList,
  Clock3, Download, FileText, LayoutDashboard, Receipt, RefreshCcw, ShieldCheck,
  TriangleAlert, Upload, UsersRound, Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSyntheticPortfolio } from "./fixtures";
import {
  addTravelCommitment, decideApproval, dollars, parseLabeledTravel,
  portfolioTotals, prepareClientInvoiceDraft, projectFinancials,
  reconcileReservation, statusReport, updateTimeSuggestion,
  type ProjectOpsData,
} from "./model";

type Tab = "portfolio" | "project" | "time" | "travel" | "approvals" | "reports";
const nav: Array<{ id: Tab; name: string; icon: typeof LayoutDashboard }> = [
  { id: "portfolio", name: "Portfolio", icon: LayoutDashboard },
  { id: "project", name: "Projects", icon: BriefcaseBusiness },
  { id: "time", name: "Time review", icon: Clock3 },
  { id: "travel", name: "Travel & costs", icon: Receipt },
  { id: "approvals", name: "PM approvals", icon: ShieldCheck },
  { id: "reports", name: "Reporting", icon: FileText },
];
const box = "rounded-2xl border border-hairline bg-white p-5 shadow-sm";
const input = "w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-moss";

export function ProjectOperations({ firmId, canEdit }: { firmId: string; canEdit: boolean }) {
  const [data, setData] = useState<ProjectOpsData>(() => createSyntheticPortfolio(firmId));
  const [tab, setTab] = useState<Tab>("portfolio");
  const [selected, setSelected] = useState("p-denver");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState("Project: DEN-104\nReservation: DEMO-NEW-117\nDescription: Project-site flight\nCategory: flight\nAmount: 425.00\nDate: 2026-11-16");
  const [fileName, setFileName] = useState("sample-confirmation.txt");
  const [actualEdits, setActualEdits] = useState<Record<string, string>>({});
  const [timeEdits, setTimeEdits] = useState<Record<string, { selected: boolean; hours: number }>>({});

  const projects = data.projects;
  const current = projects.find((p) => p.id === selected) ?? projects[0];
  const finance = projectFinancials(data, current.id);
  const portfolio = useMemo(() => portfolioTotals(data), [data]);
  const pendingApprovals = data.approvals.filter((a) => a.status === "pending");
  const currentAssignments = data.assignments.filter((a) => a.projectId === current.id);
  const currentTravel = data.travel.filter((e) => e.projectId === current.id);
  const currentTime = data.time.filter((t) => t.projectId === current.id);
  const currentVendors = data.invoices.filter((v) => v.projectId === current.id);
  const invoice = prepareClientInvoiceDraft(data, current.id);
  const banner = (message: string) => { setNotice(message); };
  const show = (projectId: string, destination: Tab = "project") => { setSelected(projectId); setTab(destination); setNotice(""); };
  const reset = () => { setData(createSyntheticPortfolio(firmId)); setTimeEdits({}); setActualEdits({}); setNotice("Synthetic scenario reset."); };

  function handleError(action: () => void, success: string) {
    try { action(); banner(success); } catch (error) { banner(error instanceof Error ? error.message : "Could not complete demo action."); }
  }
  async function chooseTextFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20000 || !/\.(txt|csv)$/i.test(file.name)) {
      banner("Demo intake accepts only .txt or .csv under 20 KB; not PDF or real receipts.");
    } else {
      setConfirmation(await file.text());
      setFileName(file.name);
      banner("Sample text loaded. Review the fields, then record the commitment.");
    }
    event.target.value = "";
  }
  function importConfirmation() {
    handleError(() => {
      const parsed = parseLabeledTravel(confirmation);
      const project = data.projects.find((p) => p.code.toLowerCase() === parsed.projectCode.toLowerCase());
      if (!project) throw new Error("Project code not found in this demonstration portfolio.");
      setData(addTravelCommitment(data, {
        projectId: project.id, category: parsed.category, description: parsed.description,
        reservationRef: parsed.reservationRef, committedCents: parsed.committedCents,
        sourceDocument: fileName || "manual-demo.txt", date: parsed.date, clientReimbursable: true,
      }));
      setSelected(project.id);
    }, "Travel confirmation recorded as a commitment, not an actual expense.");
  }
  function reconcile(ref: string, expenseId: string) {
    handleError(() => {
      const entered = actualEdits[expenseId] ?? ((data.travel.find((e) => e.id === expenseId)?.committedCents ?? 0) / 100).toFixed(2);
      const amount = Number(entered);
      if (!Number.isFinite(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(entered)) throw new Error("Enter a valid actual charge in dollars.");
      setData(reconcileReservation(data, current.id, ref, Math.round(amount * 100)));
    }, "Reservation reconciled; the commitment is replaced by the actual charge.");
  }
  function saveTimeReview() {
    handleError(() => {
      let next = data;
      for (const item of currentTime) {
        const edit = timeEdits[item.id] ?? { selected: item.selected, hours: item.confirmedHours };
        next = updateTimeSuggestion(next, item.id, edit.selected, edit.hours);
      }
      setData(next);
    }, "Employee time selections reviewed for this synthetic project. No timesheet was submitted.");
  }
  function approval(id: string, decision: "approved" | "rejected") {
    handleError(() => setData(decideApproval(data, id, decision)), `Demo request ${decision}. No financial transaction was sent.`);
  }
  function downloadStatus() {
    const file = new Blob([statusReport(data, current.id)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alec-${current.code.toLowerCase()}-status-demo.txt`;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-cream font-brand text-ink">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">ExecOS / Alec • Project operations</p>
            <h1 className="mt-2 font-display text-4xl">Project manager workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-sage">Portfolio oversight, travel commitments, time review, project approvals, and billing preparation.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-600 text-amber-800">Synthetic demonstration</Badge>
            <Button type="button" size="sm" variant="outline" onClick={reset}><RefreshCcw className="mr-2 size-3.5" /> Reset data</Button>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          This is an in-memory demo for your signed-in firm session. Changes reset on refresh; there is no shared storage, real Jira/Outlook/accounting connection, financial posting, booking, or external sending.
        </div>
        {!canEdit && <p className="mt-3 rounded-lg border border-hairline px-4 py-2 text-sm">Your firm role is read-only. Demo financial actions are disabled.</p>}
        {notice && <div role="status" className="mt-3 rounded-xl border border-hairline bg-blush px-4 py-3 text-sm text-plum-deep">{notice}</div>}
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <nav aria-label="Project operations sections" className="flex flex-wrap gap-1 rounded-2xl border border-hairline bg-white p-2 lg:flex-col">
            {nav.map(({ id, name, icon: Icon }) => (
              <button type="button" key={id} onClick={() => { setTab(id); setNotice(""); }}
                aria-current={tab === id ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-cream ${tab === id ? "bg-cream font-semibold text-moss" : "text-sage"}`}>
                <Icon className="size-4" />{name}
                {id === "approvals" && pendingApprovals.length > 0 && <span className="ml-auto rounded-full bg-blush px-2 text-xs text-plum-deep">{pendingApprovals.length}</span>}
              </button>
            ))}
          </nav>
          <div className="min-w-0 space-y-5">
            {tab === "portfolio" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat name="Project cost budgets" value={dollars(portfolio.budgetCents)} icon={Wallet} />
                  <Stat name="Actual costs" value={dollars(portfolio.actualCents)} icon={Receipt} />
                  <Stat name="Open commitments" value={dollars(portfolio.commitmentsCents)} icon={ClipboardList} />
                  <Stat name="Forecast overruns" value={String(portfolio.overBudgetCount)} icon={TriangleAlert} alert={portfolio.overBudgetCount > 0} />
                </div>
                <section className={box}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-2xl">Client engagements</h2>
                    <span className="text-xs text-sage">Click any project to explore</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {projects.map((p) => {
                      const f = projectFinancials(data, p.id);
                      return (
                        <button type="button" key={p.id} onClick={() => show(p.id)} className="w-full rounded-xl border border-hairline p-4 text-left transition hover:border-moss hover:bg-cream">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div><p className="font-semibold">{p.name}</p><p className="text-xs text-sage">{p.code} · {p.client}</p></div>
                            <div className="flex items-center gap-2">{f.forecastHeadroomCents < 0 ? <Badge variant="destructive">Over forecast</Badge> : <Badge variant="secondary">On forecast</Badge>}<ArrowRight className="size-4 text-sage" /></div>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                            <p><span className="text-sage">Budget</span><br /><strong>{dollars(p.budgetCents)}</strong></p>
                            <p><span className="text-sage">Actual + open commitments</span><br /><strong>{dollars(f.actualCents + f.outstandingCommitmentsCents)}</strong></p>
                            <p><span className="text-sage">Forecast headroom</span><br /><strong className={f.forecastHeadroomCents < 0 ? "text-red-700" : ""}>{dollars(f.forecastHeadroomCents)}</strong></p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-moss" style={{ width: `${Math.min(100, Math.max(0, f.budgetUsedPct))}%` }} /></div>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className={box}>
                  <h2 className="font-semibold">Needs PM attention</h2>
                  <div className="mt-3 space-y-2 text-sm">
                    <p><TriangleAlert className="mr-2 inline size-4 text-amber-700" />{portfolio.overBudgetCount} project(s) forecast over budget</p>
                    <p><ClipboardList className="mr-2 inline size-4 text-moss" />{pendingApprovals.length} project approvals pending</p>
                    <p><Clock3 className="mr-2 inline size-4 text-moss" />{data.time.filter((t) => !t.reviewed).length} unreviewed calendar-derived time suggestions</p>
                  </div>
                </section>
              </>
            )}
            {tab !== "portfolio" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label htmlFor="project-select" className="block text-xs font-medium text-sage">Selected engagement</label>
                  <select id="project-select" className={`${input} mt-1 max-w-md`} value={current.id} onChange={(e) => { setSelected(e.target.value); setNotice(""); }}>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
                <button type="button" className="inline-flex items-center gap-2 text-sm text-moss underline underline-offset-4" onClick={() => setTab("portfolio")}><ArrowLeft className="size-4" /> All projects</button>
              </div>
            )}
            {tab === "project" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat name="Project cost budget" value={dollars(current.budgetCents)} icon={Wallet} />
                  <Stat name="Actual costs" value={dollars(finance.actualCents)} icon={Receipt} />
                  <Stat name="Open commitments" value={dollars(finance.outstandingCommitmentsCents)} icon={ClipboardList} />
                  <Stat name="Forecast headroom" value={dollars(finance.forecastHeadroomCents)} icon={TriangleAlert} alert={finance.forecastHeadroomCents < 0} />
                </div>
                <section className={box}>
                  <h2 className="font-display text-2xl">Engagement overview</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                    <p><span className="text-sage">Client</span><br />{current.client}</p>
                    <p><span className="text-sage">Next milestone</span><br />{current.nextMilestone}</p>
                    <p><span className="text-sage">Recognized revenue (example)</span><br />{dollars(current.recognizedRevenueCents)}</p>
                    <p><span className="text-sage">Gross margin on recorded actual costs</span><br />{finance.marginPercentToDate === null ? "Not available" : `${finance.marginPercentToDate.toFixed(1)}%`} <span className="text-xs text-sage">(not a final profitability statement)</span></p>
                  </div>
                  <div className="mt-4 rounded-lg bg-cream p-3 text-xs text-sage">Forecast = recorded actual costs + outstanding travel/vendor commitments + forecast remaining labor. This demo is not a complete company accounting ledger.</div>
                </section>
                <section className={box}>
                  <h2 className="flex items-center gap-2 font-semibold"><UsersRound className="size-4" /> Assigned consultants</h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm"><thead><tr className="border-b border-hairline text-xs text-sage"><th className="py-2">Consultant</th><th>Allocation</th><th>Attendance</th><th>System</th></tr></thead>
                    <tbody>{currentAssignments.map((a) => <tr className="border-b border-hairline/60" key={a.id}><td className="py-3">{a.consultant}</td><td>{a.allocationPct}%</td><td className="capitalize">{a.attendance}</td><td>{a.source === "jira" ? "Jira" : "Microsoft Project"}</td></tr>)}</tbody></table>
                  </div>
                  <p className="mt-3 text-xs text-sage">Staffing assignments are designated by the project manager. Alec does not infer travel automatically.</p>
                </section>
                <section className={box}><h2 className="font-semibold">Project risks and recommendations</h2>
                  <ul className="mt-3 space-y-2 text-sm">{current.risks.length ? current.risks.map((r) => <li key={r} className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />{r}</li>) : <li className="text-sage">No demo risks recorded.</li>}</ul>
                  {finance.forecastHeadroomCents < 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">Investigate the projected overrun of {dollars(-finance.forecastHeadroomCents)} before approving new commitments. No staffing or budget changes will be made automatically.</p>}
                </section>
              </>
            )}
            {tab === "time" && (
              <section className={box}>
                <h2 className="font-display text-2xl">Outlook-based time suggestions</h2>
                <p className="mt-2 text-sm text-sage">Synthetic Outlook events are suggestions, not proof of hours worked. The employee selects eligible items and confirms hours before billing preparation.</p>
                <div className="mt-4 space-y-3">
                  {currentTime.map((t) => {
                    const edit = timeEdits[t.id] ?? { selected: t.selected, hours: t.confirmedHours };
                    return <div key={t.id} className="grid items-center gap-3 rounded-xl border border-hairline p-3 sm:grid-cols-[auto_1fr_100px_auto]">
                      <input aria-label={`Include ${t.meeting}`} type="checkbox" checked={edit.selected} disabled={!canEdit} onChange={(e) => setTimeEdits((old) => ({ ...old, [t.id]: { ...edit, selected: e.target.checked } }))} />
                      <div><p className="text-sm font-medium">{t.meeting}</p><p className="text-xs text-sage">{t.employee} · {t.date} · Suggested {t.suggestedHours} hours</p></div>
                      <input aria-label={`Hours for ${t.meeting}`} className={input} type="number" min="0" max="24" step="0.25" value={edit.hours} disabled={!canEdit} onChange={(e) => setTimeEdits((old) => ({ ...old, [t.id]: { ...edit, hours: Number(e.target.value) } }))} />
                      <Badge variant={t.reviewed ? "secondary" : "outline"}>{t.reviewed ? "Reviewed" : "Pending"}</Badge>
                    </div>;
                  })}
                  {!currentTime.length && <p className="text-sm text-sage">No suggested events for this project.</p>}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs text-sage">Nothing is sent to payroll, the client, or a timekeeping system.</p>
                  <Button disabled={!canEdit || currentTime.length === 0} onClick={saveTimeReview}><CheckCircle2 className="mr-2 size-4" /> Confirm time review</Button>
                </div>
              </section>
            )}
            {tab === "travel" && (
              <>
                <section className={box}>
                  <h2 className="font-display text-2xl">Record travel confirmations</h2>
                  <p className="mt-2 text-sm text-sage">Upload a labeled .txt/.csv confirmation for this synthetic workflow, or edit the example. No PDF parsing or actual corporate travel integration is active here.</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hairline px-3 py-2 text-sm"><Upload className="size-4" /> Choose text confirmation<input type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" onChange={(e) => void chooseTextFile(e)} disabled={!canEdit} /></label><span className="text-xs text-sage">{fileName}</span></div>
                  <textarea aria-label="Travel confirmation content" rows={7} className={`${input} mt-3 font-mono`} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={!canEdit} />
                  <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-sage">Fields: Project, Reservation, Description, Category, Amount, Date.</p><Button onClick={importConfirmation} disabled={!canEdit}>Record commitment</Button></div>
                </section>
                <section className={box}>
                  <h2 className="font-semibold">Travel expense ledger · {current.code}</h2>
                  <p className="mt-1 text-xs text-sage">Committed reservations are not also counted as actuals. Reconciliation replaces an open commitment with the posted charge.</p>
                  <div className="mt-4 space-y-3">
                    {currentTravel.map((e) => <div key={e.id} className="rounded-xl border border-hairline p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-sm">{e.description}</p><p className="text-xs text-sage">{e.reservationRef} · {e.sourceDocument}</p></div><Badge variant={e.actualCents !== null ? "secondary" : "outline"}>{e.actualCents !== null ? "Actual posted (demo)" : "Committed"}</Badge></div>
                      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><p>Reserved: <strong>{dollars(e.committedCents)}</strong></p><p>Actual: <strong>{e.actualCents === null ? "Not posted" : dollars(e.actualCents)}</strong></p></div>
                      {e.actualCents === null && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs text-sage">Actual charge ($)<input aria-label={`Actual charge for ${e.reservationRef}`} type="number" step="0.01" min="0" value={actualEdits[e.id] ?? (e.committedCents / 100).toFixed(2)} disabled={!canEdit} className={`${input} mt-1 max-w-40`} onChange={(ev) => setActualEdits((old) => ({ ...old, [e.id]: ev.target.value }))} /></label><Button size="sm" disabled={!canEdit} onClick={() => reconcile(e.reservationRef, e.id)}>Reconcile</Button></div>}
                    </div>)}
                    {!currentTravel.length && <p className="text-sm text-sage">No travel expenses for this project.</p>}
                  </div>
                </section>
              </>
            )}
            {tab === "approvals" && (
              <section className={box}>
                <h2 className="font-display text-2xl">Project manager approval queue</h2>
                <p className="mt-2 text-sm text-sage">The PM decides and forwards requests outside their authority. Approval here updates synthetic records only; it never releases funds or sends a transaction.</p>
                <div className="mt-4 space-y-3">
                  {data.approvals.filter((a) => a.projectId === current.id).map((a) => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline p-4">
                    <div><p className="font-medium">{a.summary}</p><p className="text-sm text-sage">{dollars(a.amountCents)} · {current.code} · {a.sourceType}</p></div>
                    {a.status === "pending" ? <div className="flex gap-2"><Button disabled={!canEdit} size="sm" variant="outline" onClick={() => approval(a.id, "rejected")}>Decline</Button><Button disabled={!canEdit} size="sm" onClick={() => approval(a.id, "approved")}>Approve (demo)</Button></div> : <Badge variant="secondary">{a.status}</Badge>}
                  </div>)}
                  {!data.approvals.some((a) => a.projectId === current.id) && <p className="text-sm text-sage">No approvals linked to this project.</p>}
                </div>
                <h3 className="mt-7 font-semibold">Vendor commitments</h3>
                <div className="mt-3 space-y-2">{currentVendors.length ? currentVendors.map((v) => <p className="rounded-lg bg-cream p-3 text-sm" key={v.id}>{v.vendor} · {v.invoiceNumber} · {dollars(v.amountCents)} · <strong>{v.status}</strong></p>) : <p className="text-sm text-sage">No vendor invoices in the fixture.</p>}</div>
              </section>
            )}
            {tab === "reports" && (
              <>
                <section className={box}>
                  <h2 className="font-display text-2xl">Project status report</h2>
                  <p className="mt-2 text-sm text-sage">Draft information from the synthetic project, financial, staffing and approval records. Never automatically distributed.</p>
                  <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-cream p-4 text-xs leading-6 text-ink">{statusReport(data, current.id)}</pre>
                  <Button className="mt-3" variant="outline" onClick={downloadStatus}><Download className="mr-2 size-4" /> Download draft report</Button>
                </section>
                <section className={box}>
                  <h2 className="font-display text-2xl">Client invoice preparation</h2>
                  <p className="mt-2 text-sm text-sage">Only employee-reviewed selected time and reconciled client-eligible travel costs appear here. Contract rates and reimbursements in this demonstration are fictional and preconfigured by the PM.</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Reviewed billable hours ({invoice.hours})</span><strong>{dollars(invoice.laborCents)}</strong></div>
                    <div className="flex justify-between"><span>Actual, client-eligible travel</span><strong>{dollars(invoice.eligibleExpenseCents)}</strong></div>
                    <div className="flex justify-between border-t border-hairline pt-3 text-lg"><span>Draft invoice total</span><strong>{dollars(invoice.totalCents)}</strong></div>
                  </div>
                  <p className="mt-4 rounded-lg bg-cream p-3 text-xs text-sage">Draft only. No invoice was created in an ERP, sent to a client, or approved for issuance.</p>
                </section>
              </>
            )}
            <p className="text-xs text-sage">Design boundary: firm authorization is required to open this workspace; this V1 demo uses fictional local records and intentionally disabled integrations.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ name, value, icon: Icon, alert = false }: { name: string; value: string; icon: typeof LayoutDashboard; alert?: boolean }) {
  return <div className="rounded-2xl border border-hairline bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-xs text-sage"><Icon className={`size-4 ${alert ? "text-red-700" : "text-moss"}`} />{name}</div>
    <p className={`mt-3 text-2xl font-semibold tracking-tight ${alert ? "text-red-700" : "text-ink"}`}>{value}</p>
  </div>;
}
