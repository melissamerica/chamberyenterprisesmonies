import { NextResponse } from "@/server/next-server";
import { applyBillingCodes, type BillingOverride } from "@/lib/billing-codes";
import { readBillingCodes } from "@/lib/billing-code-storage";
import { uploadDatabase } from "@/lib/upload-storage";
import { PUT as saveTrips } from "@/server-api/uploads/route";
import type { UploadTrip } from "@/lib/workspace-uploads";

export async function POST(request: Request) {
  let body: { trip: UploadTrip; defaultCodeId: string; overrides: BillingOverride[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose valid expense billing codes." }, { status: 400 }); }
  if (!body?.trip || !Number.isSafeInteger(body.trip.id) || body.trip.id <= 0 || typeof body.trip.executiveId !== "string" || !body.trip.executiveId || !Array.isArray(body.trip.items) || body.trip.items.length > 5000 || typeof body.defaultCodeId !== "string" || body.defaultCodeId.length > 160 || !Array.isArray(body.overrides) || body.overrides.length > 5000 || body.overrides.some(value => !value || typeof value !== "object")) return NextResponse.json({ error: "Choose a valid trip and billing codes." }, { status: 400 });
  try {
    const saved = await uploadDatabase().prepare("SELECT trip_json, updated_at FROM executive_upload_trips WHERE trip_id = ?")
      .bind(String(body.trip.id)).first<{ trip_json: string; updated_at: string }>();
    // Never overwrite another session's edits, even when this operation only changes billing codes.
    // A missing row is a create-only request; an existing row requires its exact revision.
    if ((saved?.updated_at ?? null) !== (body.trip.updatedAt ?? null))
      return NextResponse.json({ error: "This trip changed in another session. Reload the report and review your billing selections.", code: "TRIP_CONFLICT" }, { status: 409 });
    const trip = saved ? { ...JSON.parse(saved.trip_json) as UploadTrip, updatedAt: saved.updated_at } : body.trip;
    if (trip.executiveId !== body.trip.executiveId) return NextResponse.json({ error: "Choose this executive’s expense report." }, { status: 400 });
    const updated = applyBillingCodes(trip, body.defaultCodeId, body.overrides, await readBillingCodes());
    const response = await saveTrips(new Request(request.url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trips: [updated], ifMatch: saved?.updated_at ?? null }),
    }));
    if (!response.ok) return response;
    const result = await response.json() as { trip?: UploadTrip };
    if (!result.trip) return NextResponse.json({ error: "The billing code save did not return a confirmed trip revision." }, { status: 503 });
    return NextResponse.json({ trip: result.trip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing codes could not save.";
    return NextResponse.json({ error: /^Choose/.test(message) ? message : "Billing codes could not save. Your selections are still here; retry." }, { status: /^Choose/.test(message) ? 400 : 503 });
  }
}
