import { NextResponse } from "@/server/next-server";
import { importBillingCodes } from "@/lib/billing-code-storage";
import { billingCodeKey, billingImportIssue, billingImportLimit, type BillingImportInput } from "@/lib/billing-code-import";

export async function POST(request: Request) {
  let body: {rows: BillingImportInput[]; executiveIds?: string[]};
  try { body = await request.json(); } catch { return NextResponse.json({error: "Review the billing codes before importing."}, {status: 400}); }
  if (!body || !Array.isArray(body.rows) || !body.rows.length || body.rows.length > billingImportLimit) return NextResponse.json({error: `Select between 1 and ${billingImportLimit} billing codes to import.`}, {status: 400});
  const seen = new Set<string>();
  for (const row of body.rows) {
    if (!row || typeof row.code !== "string" || typeof row.label !== "string" || billingImportIssue(row) || row.expectedUpdatedAt !== undefined && (typeof row.expectedUpdatedAt !== "string" || !row.expectedUpdatedAt || row.expectedUpdatedAt.length > 80)) return NextResponse.json({error: "Each selected row needs a code (up to 80 characters) and description (up to 240 characters)."}, {status: 400});
    const key = billingCodeKey(row.code);
    if (seen.has(key)) return NextResponse.json({error: `“${row.code.trim()}” is selected more than once. Keep one row for each code.`}, {status: 400});
    seen.add(key);
  }
  if (body.executiveIds !== undefined && (!Array.isArray(body.executiveIds) || body.executiveIds.length > 1000 || body.executiveIds.some(id => typeof id !== "string" || !id.trim() || id.length > 160) || new Set(body.executiveIds).size !== body.executiveIds.length)) return NextResponse.json({error: "Choose valid executives for the imported codes."}, {status: 400});
  try { return NextResponse.json(await importBillingCodes(body.rows, body.executiveIds ?? [])); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = message.startsWith("The code list changed");
    return NextResponse.json({error: conflict ? message : "The import could not save. Your review is still here; try again."}, {status: conflict ? 409 : 503});
  }
}
