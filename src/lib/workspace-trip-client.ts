import type { UploadTrip } from "./workspace-uploads";

/** Persist one interactive trip against the exact revision last loaded. */
export async function saveInteractiveTrip<T extends UploadTrip>(trip: T): Promise<T> {
  const response = await fetch("/api/uploads", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trips: [trip], ifMatch: trip.updatedAt ?? null }),
  });
  const result = await response.json() as { saved?: boolean; trip?: T; error?: string };
  if (!response.ok || !result.saved || !result.trip?.updatedAt)
    throw new Error(result.error || "The trip was not saved. Reload your firm's records and retry.");
  return result.trip;
}
