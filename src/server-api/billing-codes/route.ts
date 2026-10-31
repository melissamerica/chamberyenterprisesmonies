import { NextResponse } from "@/server/next-server";
import { readBillingCodes, writeBillingCode } from "@/lib/billing-code-storage";

export async function GET() {
  try { return NextResponse.json({ codes: await readBillingCodes() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Billing codes could not load. Try again." }, { status: 503 }); }
}
export async function PUT(request: Request) {
  let body: { id?: string; code: string; label: string; active: boolean; executiveIds?: string[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a billing code and description." }, { status: 400 }); }
  if (!body || typeof body.code !== "string" || !body.code.trim() || body.code.trim().length > 80 || typeof body.label !== "string" || !body.label.trim() || body.label.trim().length > 240 || typeof body.active !== "boolean" || body.id !== undefined && (typeof body.id !== "string" || !body.id || body.id.length > 160)) return NextResponse.json({ error: "Enter a code (up to 80 characters) and description (up to 240 characters)." }, { status: 400 });
  if (body.executiveIds !== undefined && (!Array.isArray(body.executiveIds) || body.executiveIds.length > 1000 || body.executiveIds.some(id => typeof id !== "string" || !id.trim() || id.length > 160) || new Set(body.executiveIds).size !== body.executiveIds.length)) return NextResponse.json({error: "Choose valid executives for this billing code."}, {status: 400});
  try { return NextResponse.json({ code: await writeBillingCode(body) }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "The billing code could not save.";
    const known = /already exists|no longer exists/.test(message);
    return NextResponse.json({ error: known ? message : "The billing code could not save. Your edits are still here." }, { status: known ? 409 : 503 });
  }
}
