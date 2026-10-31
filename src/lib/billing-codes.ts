export type BillingCodeSelection = { id: string; code: string; label: string };
export type BillingCode = BillingCodeSelection & { active: boolean; updatedAt: string; executiveIds?: string[] };
export type BillingOverride = { itemId: number; codeId: string | null };

export function billingCodeText(value: BillingCodeSelection | null | undefined) {
  return value ? `${value.code} · ${value.label}` : "";
}
export function effectiveBillingCode(item: { billingCode?: BillingCodeSelection | null }, trip: { billingCode?: BillingCodeSelection }) {
  return item.billingCode === undefined ? trip.billingCode : item.billingCode ?? undefined;
}
export function validBillingSelection(value: unknown, nullable = false): boolean {
  if (value === undefined || nullable && value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && !!candidate.id.trim() && candidate.id.length <= 160 && typeof candidate.code === "string" && !!candidate.code.trim() && candidate.code.length <= 80 && typeof candidate.label === "string" && !!candidate.label.trim() && candidate.label.length <= 240;
}
export function applyBillingCodes<T extends { billingCode?: BillingCodeSelection; items: Array<{ id: number; kind: string; expenseEligible?: boolean; cost?: number; source?: string; billingCode?: BillingCodeSelection | null }> }>(trip: T, defaultId: string, overrides: BillingOverride[], codes: BillingCode[]): T {
  const resolve = (id: string, previous?: BillingCodeSelection | null): BillingCodeSelection | undefined => {
    if (!id) return undefined;
    // Existing assignments retain their saved wording, including archived codes.
    if (previous?.id === id) return previous;
    const code = codes.find(value => value.id === id && value.active);
    if (!code) throw new Error("Choose an active billing code or keep the existing assignment.");
    return { id: code.id, code: code.code, label: code.label };
  };
  const eligible = new Set(trip.items.filter(item => item.kind !== "Appointment" && item.expenseEligible !== false && (typeof item.cost === "number" || !!item.source)).map(item => item.id));
  const values = new Map<number, string | null>();
  for (const override of overrides) {
    if (!Number.isSafeInteger(override.itemId) || !eligible.has(override.itemId) || values.has(override.itemId) || override.codeId !== null && (typeof override.codeId !== "string" || override.codeId.length > 160)) throw new Error("Choose one valid billing code for each expense.");
    values.set(override.itemId, override.codeId);
  }
  return { ...trip, billingCode: resolve(defaultId, trip.billingCode), items: trip.items.map(item => {
    if (!values.has(item.id)) return item;
    const id = values.get(item.id)!;
    return { ...item, billingCode: id === null ? null : resolve(id, item.billingCode) };
  }) };
}
