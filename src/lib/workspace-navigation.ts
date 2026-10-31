export type WorkspacePage = "home" | "executive" | "itinerary" | "calendar" | "expenses" | "unassigned-expenses" | "templates" | "billing-codes" | "profile";
export type WorkspaceDestination = { page: WorkspacePage; travelerId?: string; tripId?: number; templateId?: string; templateTab?: "outlook" | "print" | "expenses" };
const pages: WorkspacePage[] = ["home", "executive", "itinerary", "calendar", "expenses", "unassigned-expenses", "templates", "billing-codes", "profile"];

export function parseWorkspaceDestination(value: unknown): WorkspaceDestination | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const page = candidate.page === "traveler" ? "executive" : candidate.page;
  if (!pages.includes(page as WorkspacePage)) return null;
  return {
    page: page as WorkspacePage,
    ...(typeof candidate.travelerId === "string" && candidate.travelerId ? { travelerId: candidate.travelerId } : {}),
    ...(typeof candidate.tripId === "number" && Number.isSafeInteger(candidate.tripId) && candidate.tripId > 0 ? { tripId: candidate.tripId } : {}),
    ...(typeof candidate.templateId === "string" && candidate.templateId ? { templateId: candidate.templateId } : {}),
    ...(["outlook", "print", "expenses"].includes(String(candidate.templateTab)) ? { templateTab: candidate.templateTab as WorkspaceDestination["templateTab"] } : {}),
  };
}

export function destinationFromSearch(search: string) {
  const query = new URLSearchParams(search);
  return parseWorkspaceDestination({ page: query.get("view"), travelerId: query.get("executive") ?? query.get("traveler"), tripId: query.has("trip") ? Number(query.get("trip")) : undefined, templateId: query.get("templateId"), templateTab: query.get("template") });
}

export function savedWorkspaceDestination(value: string | null) {
  try { return value ? parseWorkspaceDestination(JSON.parse(value)) : null; } catch { return null; }
}
