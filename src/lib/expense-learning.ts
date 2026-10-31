import { cityForUpload, vendorForUpload, uploadCategories, type UploadRow } from "./workspace-uploads";

export type LearningScope = "evidence" | "trip" | "vendor_city" | "executive_vendor";
export type LearningFeedback = { reason?: string; scope?: LearningScope; rememberCategory?: boolean };
export type ExpenseDecision = {
  id: string; executiveId: string; rowKey: string; fileId: string; source: string;
  vendor: string; city: string; description: string; date: string; amount: string;
  tripId?: string; tripName?: string; category: string; previousCategory: string;
  action: "assign" | "exclude"; outcome: "accepted" | "corrected" | "rejected";
  scope: LearningScope; reason: string; recordedAt: string; active: boolean;
  provenance: "transaction_review"; actor: "workspace_user";
  suggestion?: { status: string; category?: string; kind: string; sourceIds: string[] };
};
export type ExpensePreference = {
  id: string; executiveId: string; vendor: string; vendorKey: string; city: string; cityKey: string;
  tripId?: string; scope: Exclude<LearningScope, "evidence">; category: string;
  sourceDecisionId: string; reason: string; recordedAt: string; active: boolean;
};
export type LearningKnowledge = { enabled: boolean; decisions: ExpenseDecision[]; preferences: ExpensePreference[] };
export const emptyLearningKnowledge = (): LearningKnowledge => ({ enabled: true, decisions: [], preferences: [] });
export type ExpenseSuggestion = {
  kind: "category" | "exclude" | "conflict"; status: "confirmed" | "inferred" | "conflict";
  category?: string; explanation: string; sourceIds: string[]; support: number;
};

/** Strip terminal/order numbers, not merchant words. No document text is executable. */
export function learningVendorKey(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(?:ref|order|trip|terminal|store|pos)[\s#*:.-]*\d+[a-z0-9-]*\b/g, " ")
    .replace(/\b(?:llc|inc|ltd|purchase|payment|debit|credit|card)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  // A trailing transaction number after a multi-word merchant can vary. Preserve numeric brands.
  if (parts.length >= 3 && /^\d{3,}$/.test(parts[parts.length - 1]) && parts.slice(0, -1).filter(part => /[a-z]/.test(part)).length >= 2) parts.pop();
  return parts.join(" ");
}
const cityKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
function similarity(left: string, right: string) {
  const a = learningVendorKey(left), b = learningVendorKey(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = new Set(a.split(" ").filter(token => token.length > 2));
  const bb = new Set(b.split(" ").filter(token => token.length > 2));
  const shared = [...aa].filter(token => bb.has(token)).length;
  // A generic shared word such as "restaurant" is not enough to reuse a decision.
  return shared >= 2 ? shared / Math.sqrt(aa.size * bb.size) : 0;
}
function observationKey(value: ExpenseDecision) {
  return JSON.stringify([learningVendorKey(value.vendor), value.date, Number(value.amount)]);
}

/** A small, local, feedback-trained nearest-neighbour classifier. Never chooses a trip. */
export function suggestExpense(row: UploadRow, executiveId: string, knowledge: LearningKnowledge, at = new Date().toISOString()): ExpenseSuggestion | null {
  if (row.kind !== "expense") return null;
  const vendor = vendorForUpload(row), key = learningVendorKey(vendor), city = cityKey(cityForUpload(row));
  if (!key) return null;
  const confirmed = knowledge.preferences.filter(pref => pref.active && pref.executiveId === executiveId && pref.vendorKey === key && pref.recordedAt <= at
    && (pref.scope === "executive_vendor" || pref.scope === "vendor_city" && !!city && pref.cityKey === city || pref.scope === "trip" && !!row.tripId && pref.tripId === row.tripId));
  const specificity = (pref: ExpensePreference) => pref.scope === "trip" ? 3 : pref.scope === "vendor_city" ? 2 : 1;
  const level = Math.max(0, ...confirmed.map(specificity));
  const strongest = confirmed.filter(pref => specificity(pref) === level);
  if (strongest.length) {
    if (new Set(strongest.map(pref => pref.category)).size > 1) return { kind: "conflict", status: "conflict", explanation: "Saved category preferences disagree. Keep your current choice or review the memories below.", sourceIds: strongest.map(pref => pref.id), support: strongest.length };
    const pref = strongest.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    return { kind: "category", status: "confirmed", category: pref.category, explanation: `Saved preference: ${pref.vendor}${pref.scope === "vendor_city" ? ` in ${pref.city}` : pref.scope === "trip" ? " for this trip" : " for this executive"} → ${pref.category}.`, sourceIds: [pref.id], support: 1 };
  }
  if (!knowledge.enabled || !city) return null;
  const unique = new Map<string, ExpenseDecision>();
  for (const decision of [...knowledge.decisions].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id))) {
    if (decision.executiveId !== executiveId || decision.recordedAt >= at) continue;
    // Leave this very transaction out: retries and statement/receipt copies are not independent evidence.
    if (decision.rowKey === row.key || observationKey(decision) === JSON.stringify([key, row.date, Number(row.amount)])) continue;
    const fingerprint = observationKey(decision);
    if (!unique.has(fingerprint)) unique.set(fingerprint, decision);
  }
  const neighbours = [...unique.values()].flatMap(decision => {
    if (!decision.active || decision.scope === "trip" && decision.tripId !== row.tripId || cityKey(decision.city) !== city) return [];
    const related = similarity(vendor, decision.vendor);
    if (related < .65) return [];
    const ageDays = Math.max(0, (Date.parse(at) - Date.parse(decision.recordedAt)) / 86400000);
    const weight = related * (.5 + .5 / (1 + ageDays / 180));
    return [{ decision, weight }];
  }).sort((a, b) => b.weight - a.weight).slice(0, 20);
  if (neighbours.length < 3) return null;
  const groups = new Map<string, { weight: number; values: ExpenseDecision[] }>();
  for (const { decision, weight } of neighbours) {
    const label = decision.action === "exclude" ? "exclude" : decision.category;
    if (label !== "exclude" && !uploadCategories.includes(label)) continue;
    const group = groups.get(label) ?? { weight: 0, values: [] };
    group.weight += weight; group.values.push(decision); groups.set(label, group);
  }
  const ranked = [...groups.entries()].sort((a, b) => b[1].weight - a[1].weight);
  const total = ranked.reduce((sum, [, value]) => sum + value.weight, 0), winner = ranked[0];
  if (!winner || winner[1].values.length < 3 || winner[1].weight / total < .8) return { kind: "conflict", status: "conflict", explanation: "Similar past decisions differ. No learned category has been applied.", sourceIds: neighbours.map(value => value.decision.id), support: neighbours.length };
  const [label, evidence] = winner;
  return { kind: label === "exclude" ? "exclude" : "category", status: "inferred", ...(label === "exclude" ? {} : { category: label }),
    explanation: `Pattern from ${evidence.values.length} earlier decisions for similar ${vendor} charges in ${cityForUpload(row)}${label === "exclude" ? ": treated as non-travel." : `: ${label}.`}`,
    sourceIds: evidence.values.map(value => value.id), support: evidence.values.length };
}

export function validLearningFeedback(value: unknown): value is LearningFeedback | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as LearningFeedback;
  return (v.reason === undefined || typeof v.reason === "string" && v.reason.length <= 400)
    && (v.scope === undefined || ["evidence", "trip", "vendor_city", "executive_vendor"].includes(v.scope))
    && (v.rememberCategory === undefined || typeof v.rememberCategory === "boolean")
    && (!v.rememberCategory || !!v.scope && v.scope !== "evidence");
}

export function buildExpenseDecision(executiveId: string, row: UploadRow, original: UploadRow | undefined, action: "assign" | "exclude", tripName: string | undefined, feedback: LearningFeedback = {}, knowledge = emptyLearningKnowledge(), at = new Date().toISOString()) {
  const scope = feedback.scope ?? "evidence", vendor = vendorForUpload(row), city = cityForUpload(row);
  if (!uploadCategories.includes(row.category)) throw new Error("Choose a valid expense category.");
  if (feedback.rememberCategory && (action !== "assign" || !learningVendorKey(vendor) || scope === "vendor_city" && !cityKey(city) || scope === "trip" && !row.tripId || scope === "evidence")) throw new Error("Choose a vendor, scope, and any required city or trip before remembering a category.");
  const suggestion = suggestExpense(original ?? row, executiveId, knowledge, at);
  const id = JSON.stringify([executiveId, row.key, action, row.category, scope]);
  const rejectedSuggestion = suggestion?.kind === "category" && (action === "exclude" || suggestion.category !== row.category) || suggestion?.kind === "exclude" && action === "assign";
  const acceptedSuggestion = suggestion?.kind === "category" && suggestion.category === row.category || suggestion?.kind === "exclude" && action === "exclude";
  const decision: ExpenseDecision = { id, executiveId, rowKey: row.key, fileId: row.fileId, source: row.source.slice(0, 240), vendor: vendor.slice(0, 240), city: city.slice(0, 160), description: row.title.slice(0, 500), date: row.date, amount: row.amount,
    tripId: row.tripId || original?.tripId || undefined, tripName: tripName?.slice(0, 240), category: row.category, previousCategory: original?.category ?? row.category,
    action, outcome: rejectedSuggestion ? original && original.category !== row.category ? "corrected" : "rejected" : acceptedSuggestion || !original || original.category === row.category && (action !== "exclude" || original.suggestedAction === "exclude") ? "accepted" : "corrected",
    scope, reason: feedback.reason?.trim() ?? "", recordedAt: at, active: true, provenance: "transaction_review", actor: "workspace_user",
    ...(suggestion ? { suggestion: { status: suggestion.status, kind: suggestion.kind, category: suggestion.category, sourceIds: suggestion.sourceIds } } : {}) };
  const preference: ExpensePreference | undefined = feedback.rememberCategory ? {
    id: JSON.stringify([executiveId, learningVendorKey(vendor), scope, scope === "vendor_city" ? cityKey(city) : scope === "trip" ? row.tripId : ""]),
    executiveId, vendor: vendor.slice(0, 240), vendorKey: learningVendorKey(vendor), city, cityKey: cityKey(city), scope: scope as ExpensePreference["scope"], tripId: scope === "trip" ? row.tripId : undefined,
    category: row.category, sourceDecisionId: id, reason: decision.reason, recordedAt: at, active: true } : undefined;
  return { decision, preference };
}
