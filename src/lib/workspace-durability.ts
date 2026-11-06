import type { Executive } from "./executive-profiles";
import type { UploadTrip } from "./workspace-uploads";

export type LegacyWorkspace = { trips: UploadTrip[]; executives: Executive[] };

/**
 * Legacy v53 records have no account/firm identity. NEVER read or assign them
 * during normal workspace hydration. Only call this after an explicit review
 * action by the signed-in user. Do not delete these keys during migration.
 */
export function readLegacyWorkspace(storage: Pick<Storage, "getItem">): LegacyWorkspace {
  function read(key: string): unknown {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) as unknown : null;
    } catch { return null; }
  }
  const rawTrips = read("trip-workspace-trips");
  const rawExecutives = read("anya-executives");
  const trips = (Array.isArray(rawTrips) ? rawTrips : []).filter((value): value is UploadTrip =>
    !!value && Number.isSafeInteger(value.id) && value.id > 0 &&
    typeof value.name === "string" && typeof value.traveler === "string" &&
    typeof value.dates === "string" && typeof value.route === "string" &&
    Array.isArray(value.items) && value.items.every((item: unknown) =>
      !!item && typeof item === "object" && Number.isSafeInteger((item as { id?: unknown }).id))
  );
  const executives = (Array.isArray(rawExecutives) ? rawExecutives : []).filter((value): value is Executive =>
    !!value && typeof value.id === "string" && !!value.id.trim() &&
    typeof value.name === "string" && !!value.name.trim()
  );
  return { trips, executives };
}

/** Import never overwrites an existing firm record with an unscoped browser record. */
export function missingById<T extends { id: number | string }>(server: T[], legacy: T[]): T[] {
  const seen = new Set<number | string>(server.map(item => item.id));
  return legacy.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Server confirmation, never HTTP 200 alone, is required before showing "saved". */
export async function persistFirmTrip(trip: UploadTrip, request: typeof fetch = fetch): Promise<void> {
  if (!trip.executiveId?.trim()) throw new Error("Choose an executive before saving this trip.");
  const response = await request("/api/uploads", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trips: [trip] }),
  });
  const result = await response.json().catch(() => null) as { saved?: boolean; error?: string } | null;
  if (!response.ok || result?.saved !== true) {
    throw new Error(result?.error || "The trip could not be saved to your firm. Your changes were not confirmed.");
  }
}

/** Navigation-only preferences; never store trip, expense or executive data here. */
export function navigationKey(firmId: string, userId: string, name: string): string {
  if (!firmId || !userId || !name) throw new Error("Firm and user identity are required for browser preferences.");
  return `chambery-nav:${firmId}:${userId}:${name}`;
}

/** Remove current-user navigation state at sign-out; never erase unrecovered legacy data. */
export function clearUserNavigation(storage: Pick<Storage, "length" | "key" | "removeItem">, userId: string): void {
  if (!userId) return;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("chambery-nav:") && key.includes(`:${userId}:`)) keys.push(key);
  }
  keys.forEach(key => storage.removeItem(key));
}
