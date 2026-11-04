/**
 * Alec Project Operations V1 — pure, deterministic demo domain.
 * No live system calls. All monetary values are USD in cents to avoid floating-point drift.
 * These records are synthetic and are never written to the firm's existing workspace.
 */
export type ProjectStatus = "active" | "at-risk" | "complete";
export type TripCategory = "flight" | "hotel" | "ground" | "other";
export type ApprovalState = "pending" | "approved" | "rejected";
export type SourceSystem = "jira" | "microsoft-project";

export interface Assignment {
  id: string;
  projectId: string;
  consultant: string;
  allocationPct: number;
  attendance: "onsite" | "hybrid" | "remote";
  city: string;
  startDate: string;
  endDate: string;
  source: SourceSystem;
}
export interface Project {
  id: string;
  code: string;
  client: string;
  name: string;
  budgetCents: number;
  contractedRevenueCents: number;
  recognizedRevenueCents: number;
  laborCostToDateCents: number;
  futureLaborForecastCents: number;
  hourlyBillingRateCents: number;
  status: ProjectStatus;
  nextMilestone: string;
  risks: string[];
}
export interface TravelExpense {
  id: string;
  projectId: string;
  category: TripCategory;
  description: string;
  reservationRef: string;
  sourceDocument: string;
  committedCents: number;
  actualCents: number | null;
  clientReimbursable: boolean;
  date: string;
}
export interface VendorInvoice {
  id: string;
  projectId: string;
  vendor: string;
  invoiceNumber: string;
  purchaseOrder: string;
  amountCents: number;
  status: ApprovalState;
}
export interface TimeSuggestion {
  id: string;
  projectId: string;
  employee: string;
  meeting: string;
  date: string;
  suggestedHours: number;
  confirmedHours: number;
  selected: boolean;
  reviewed: boolean;
  source: "outlook-sample";
}
export interface ProjectApproval {
  id: string;
  projectId: string;
  summary: string;
  amountCents: number;
  sourceType: "expense" | "vendor" | "other";
  sourceId: string;
  status: ApprovalState;
}
export interface ProjectOpsData {
  firmId: string;
  projects: Project[];
  assignments: Assignment[];
  travel: TravelExpense[];
  invoices: VendorInvoice[];
  time: TimeSuggestion[];
  approvals: ProjectApproval[];
}
export interface ProjectFinancials {
  actualCents: number;
  outstandingCommitmentsCents: number;
  forecastCents: number;
  forecastHeadroomCents: number;
  marginToDateCents: number;
  marginPercentToDate: number | null;
  budgetUsedPct: number;
}
export interface InvoiceDraft {
  projectId: string;
  hours: number;
  laborCents: number;
  eligibleExpenseCents: number;
  totalCents: number;
  state: "draft-only";
}
export const dollars = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

/** Only confirmed actuals count toward spend; unposted reservations remain commitments. */
export function projectFinancials(data: ProjectOpsData, projectId: string): ProjectFinancials {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Unknown project");
  const travel = data.travel.filter((e) => e.projectId === projectId);
  const vendors = data.invoices.filter((i) => i.projectId === projectId && i.status !== "rejected");
  const actualTravel = travel.reduce((sum, e) => sum + (e.actualCents ?? 0), 0);
  const committedTravel = travel.reduce((sum, e) => sum + (e.actualCents === null ? e.committedCents : 0), 0);
  const approvedVendors = vendors.filter((i) => i.status === "approved").reduce((sum, i) => sum + i.amountCents, 0);
  const pendingVendors = vendors.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.amountCents, 0);
  const actualCents = project.laborCostToDateCents + actualTravel + approvedVendors;
  const outstandingCommitmentsCents = committedTravel + pendingVendors;
  const forecastCents = actualCents + outstandingCommitmentsCents + project.futureLaborForecastCents;
  return {
    actualCents, outstandingCommitmentsCents, forecastCents,
    forecastHeadroomCents: project.budgetCents - forecastCents,
    marginToDateCents: project.recognizedRevenueCents - actualCents,
    marginPercentToDate: project.recognizedRevenueCents > 0 ? (project.recognizedRevenueCents - actualCents) / project.recognizedRevenueCents * 100 : null,
    budgetUsedPct: project.budgetCents > 0 ? Math.round(actualCents / project.budgetCents * 100) : 0,
  };
}

export function portfolioTotals(data: ProjectOpsData) {
  return data.projects.reduce((result, project) => {
    const f = projectFinancials(data, project.id);
    result.budgetCents += project.budgetCents;
    result.actualCents += f.actualCents;
    result.commitmentsCents += f.outstandingCommitmentsCents;
    result.forecastCents += f.forecastCents;
    result.overBudgetCount += f.forecastHeadroomCents < 0 ? 1 : 0;
    return result;
  }, { budgetCents: 0, actualCents: 0, commitmentsCents: 0, forecastCents: 0, overBudgetCount: 0 });
}

export function reconcileReservation(data: ProjectOpsData, projectId: string, reservationRef: string, actualCents: number): ProjectOpsData {
  if (!Number.isSafeInteger(actualCents) || actualCents < 0) throw new Error("Invalid actual amount");
  const candidates = data.travel.filter((e) => e.projectId === projectId && e.reservationRef === reservationRef);
  if (candidates.length !== 1) throw new Error("Reservation must match exactly one project expense");
  const expense = candidates[0];
  if (expense.actualCents !== null && expense.actualCents !== actualCents) throw new Error("Already reconciled; manual correction is required");
  return { ...data, travel: data.travel.map((e) => e.id === expense.id ? { ...e, actualCents } : e) };
}

export function addTravelCommitment(data: ProjectOpsData, input: Omit<TravelExpense, "id" | "actualCents">): ProjectOpsData {
  if (!data.projects.some((p) => p.id === input.projectId)) throw new Error("Unknown project");
  if (!input.reservationRef.trim() || !input.description.trim() || !input.sourceDocument.trim()) throw new Error("Missing confirmation details");
  if (!Number.isSafeInteger(input.committedCents) || input.committedCents <= 0) throw new Error("Invalid amount");
  const duplicate = data.travel.some((e) => e.projectId === input.projectId && e.reservationRef.toLowerCase() === input.reservationRef.toLowerCase());
  if (duplicate) throw new Error("Confirmation already recorded; no duplicate commitment created");
  return { ...data, travel: [...data.travel, { ...input, id: `travel-${data.travel.length + 1}`, actualCents: null }] };
}

/** A deliberately constrained synthetic .txt/.csv intake, never arbitrary PDF OCR. */
export function parseLabeledTravel(text: string) {
  const parts = Object.fromEntries(text.split(/\r?\n/).map((line) => {
    const idx = line.indexOf(":");
    return idx === -1 ? null : [line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim()];
  }).filter((part): part is [string, string] => !!part && part.length === 2));
  const amount = Number(parts.amount);
  const category = parts.category;
  if (!parts.project || !parts.reservation || !parts.description || !parts.date ||
      !["flight", "hotel", "ground", "other"].includes(category) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parts.date) ||
      !Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(parts.amount)) {
    throw new Error("Use labeled lines: Project, Reservation, Description, Category, Amount, Date");
  }
  return { projectCode: parts.project, reservationRef: parts.reservation,
    description: parts.description, category: category as TripCategory,
    committedCents: Math.round(amount * 100), date: parts.date };
}

export function updateTimeSuggestion(data: ProjectOpsData, id: string, selected: boolean, confirmedHours: number): ProjectOpsData {
  if (!Number.isFinite(confirmedHours) || confirmedHours < 0 || confirmedHours > 24) throw new Error("Invalid time entry");
  if (!data.time.some((t) => t.id === id)) throw new Error("Time suggestion not found");
  return { ...data, time: data.time.map((t) => t.id === id ? { ...t, selected, confirmedHours, reviewed: true } : t) };
}

export function prepareClientInvoiceDraft(data: ProjectOpsData, projectId: string): InvoiceDraft {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Unknown project");
  const hours = data.time.filter((t) => t.projectId === projectId && t.selected && t.reviewed).reduce((sum, t) => sum + t.confirmedHours, 0);
  const eligibleExpenseCents = data.travel.filter((e) => e.projectId === projectId && e.clientReimbursable && e.actualCents !== null).reduce((sum, e) => sum + (e.actualCents ?? 0), 0);
  const laborCents = Math.round(hours * project.hourlyBillingRateCents);
  return { projectId, hours, laborCents, eligibleExpenseCents, totalCents: laborCents + eligibleExpenseCents, state: "draft-only" };
}

export function decideApproval(data: ProjectOpsData, id: string, status: Exclude<ApprovalState, "pending">): ProjectOpsData {
  const approval = data.approvals.find((a) => a.id === id);
  if (!approval || approval.status !== "pending") throw new Error("Approval is not pending");
  const invoices = approval.sourceType === "vendor" && status === "approved"
    ? data.invoices.map((i) => i.id === approval.sourceId ? { ...i, status: "approved" as const } : i)
    : data.invoices;
  return {
    ...data, invoices,
    approvals: data.approvals.map((a) => a.id === id ? { ...a, status } : a),
  };
}

export function validateAllocationShares(shares: Array<{ projectId: string; percent: number }>): boolean {
  if (!shares.length || new Set(shares.map((x) => x.projectId)).size !== shares.length) return false;
  if (shares.some((x) => !x.projectId || !Number.isFinite(x.percent) || x.percent <= 0 || x.percent > 100)) return false;
  return Math.abs(shares.reduce((s, x) => s + x.percent, 0) - 100) < 0.000001;
}

export function statusReport(data: ProjectOpsData, projectId: string): string {
  const p = data.projects.find((project) => project.id === projectId);
  if (!p) throw new Error("Unknown project");
  const f = projectFinancials(data, projectId);
  const assignments = data.assignments.filter((a) => a.projectId === projectId);
  const approvals = data.approvals.filter((a) => a.projectId === projectId && a.status === "pending");
  return [
    "ALEC PROJECT STATUS — SYNTHETIC DEMONSTRATION", `Project: ${p.name} (${p.code})`,
    `Client: ${p.client}`, `Milestone: ${p.nextMilestone}`,
    `Budget: ${dollars(p.budgetCents)}`, `Actual costs: ${dollars(f.actualCents)}`,
    `Outstanding commitments: ${dollars(f.outstandingCommitmentsCents)}`,
    `Forecast total costs: ${dollars(f.forecastCents)}`,
    `Forecast headroom: ${dollars(f.forecastHeadroomCents)}`,
    `Active assignments: ${assignments.length}`, `Pending PM approvals: ${approvals.length}`,
    "Risks:", ...(p.risks.length ? p.risks.map((x) => `- ${x}`) : ["- None recorded"]),
    "Not a client-facing report. PM approval required before distribution."
  ].join("\n");
}
