import type { TravelConfirmation, TravelEntry } from "../../src/lib/travel-confirmations";

/** Small, browser-only adapter around Anya's travel and export types. */
export type MiniTrip = {
  id: number;
  name: string;
  traveler: string;
  route: string;
  dates: string;
  items: TravelEntry[];
};

export type ExpenseDraft = {
  title: string;
  date: string;
  amount: string;
  category: string;
  source: string;
  detail?: string;
  evidenceKind?: "receipt" | "statement";
};

function normalize(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function tripFromConfirmation(
  confirmation: TravelConfirmation,
  id: number,
): MiniTrip {
  return {
    id,
    name: confirmation.name,
    traveler: confirmation.traveler,
    route: confirmation.route,
    dates: confirmation.dates,
    items: [],
  };
}

export function tripForExpense(id: number, name: string, traveler: string): MiniTrip {
  return { id, name: name.trim(), traveler: traveler.trim(), route: "", dates: "", items: [] };
}

export function expenseEntry(draft: ExpenseDraft, id: number): TravelEntry {
  const raw = draft.amount.trim().replace(/[$,]/g, "");
  const cost = raw.length && Number.isFinite(Number(raw)) ? Number(raw) : undefined;
  return {
    id,
    kind: "Expense",
    title: draft.title.trim() || "Unclassified expense",
    detail: draft.detail || "Expense reviewed by user",
    date: draft.date.trim(),
    time: "",
    start: draft.date.trim() ? draft.date.trim() + "T00:00:00Z" : undefined,
    cost,
    source: draft.source,
    expenseCategory: draft.category,
    expenseDescription: draft.title.trim(),
    expenseDate: draft.date.trim(),
    expenseEligible: true,
    expenseEvidence: draft.evidenceKind ? [{ fileId: draft.source, kind: draft.evidenceKind }] : [],
  };
}

/** Never remove a line automatically: only report possible duplicates for review. */
export function duplicateReason(existing: TravelEntry[], incoming: TravelEntry): string | null {
  const source = existing.find(item => {
    if (item.kind !== incoming.kind) return false;
    if (incoming.kind === "Flight") {
      return Boolean(
        item.flightCode && incoming.flightCode &&
        normalize(item.flightCode) === normalize(incoming.flightCode) &&
        item.start && incoming.start && item.start === incoming.start,
      );
    }
    if (incoming.kind === "Expense") {
      return Boolean(
        normalize(item.expenseDescription || item.title) &&
        normalize(item.expenseDescription || item.title) === normalize(incoming.expenseDescription || incoming.title) &&
        (item.expenseDate || item.date) === (incoming.expenseDate || incoming.date) &&
        item.cost != null && item.cost === incoming.cost,
      );
    }
    return Boolean(
      (item.confirmation && incoming.confirmation && normalize(item.confirmation) === normalize(incoming.confirmation)) ||
      (normalize(item.title) === normalize(incoming.title) && item.start === incoming.start),
    );
  });
  if (source) return "A matching " + incoming.kind.toLowerCase() + " record is already in this trip.";
  if (incoming.kind === "Expense" && incoming.cost != null) {
    const possible = existing.find(item =>
      item.kind !== "Expense" &&
      item.expenseEligible !== false &&
      item.cost != null && item.cost === incoming.cost &&
      (item.expenseDate || item.date) === (incoming.expenseDate || incoming.date));
    if (possible) return "Same date and amount as an existing booking expense; review before adding a second charge.";
  }
  return null;
}

export function expenseSummary(trip: MiniTrip) {
  const entries = trip.items.filter(i => i.kind !== "Appointment" && i.expenseEligible !== false && (i.cost != null || !!i.source));
  const knownTotal = entries.reduce((sum, i) => sum + (typeof i.cost === "number" && Number.isFinite(i.cost) ? i.cost : 0), 0);
  const missing = entries.filter(i => typeof i.cost !== "number" || !Number.isFinite(i.cost)).length;
  return { count: entries.length, knownTotal, missing };
}

export const sampleTrip: MiniTrip = {
  id: 1001,
  name: "Denver Operations Summit — SAMPLE",
  traveler: "Jordan Vale",
  route: "TLH → DEN",
  dates: "2026-11-18 – 2026-11-20",
  items: [
    { id: 1002, kind: "Flight", title: "DL 240 · TLH → DEN", detail: "Confirmation EXAMPLE1 · Seat 12A", date: "2026-11-18", time: "8:00 AM – 11:40 AM", start: "2026-11-18T13:00:00Z", end: "2026-11-18T18:40:00Z", origin: "TLH", destination: "DEN", flightCode: "DL 240", seat: "12A", confirmation: "EXAMPLE1", departureTime: "8:00 AM", arrivalTime: "11:40 AM", location: "Tallahassee International Airport", cost: 438.20, expenseCategory: "Flight", source: "SAMPLE / fictional booking", expenseEligible: true },
    { id: 1003, kind: "Hotel", title: "Fictional City Center Hotel", detail: "Confirmation EXAMPLE2", date: "2026-11-18", time: "Nov 18–20", start: "2026-11-18T00:00:00Z", end: "2026-11-20T00:00:00Z", allDay: true, location: "Denver, CO", cost: 399.00, expenseCategory: "Hotel", source: "SAMPLE / fictional booking", expenseEligible: true },
    { id: 1004, kind: "Expense", title: "Fictional Café", detail: "SAMPLE / fictional receipt", date: "2026-11-19", time: "", expenseDate: "2026-11-19", expenseDescription: "Fictional Café", cost: 23.45, expenseCategory: "Meals", source: "SAMPLE / fictional receipt", expenseEligible: true, expenseEvidence: [{ fileId: "sample-receipt", kind: "receipt" }] },
  ],
};
