import { env } from "@/server/runtime-env";
import type { CommunicationBatch, DeliveryIntent, ResponseAction, SavedItemResponse } from "@/features/communication-queue/types";

// Decision Queue storage (firm-scoped). Delivery is recorded as intent only: live sends stay disabled.
function db() { const d = env.DB; if (!d) throw new Error("Decision queue storage is unavailable."); return d; }
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const str = (v: unknown, max = 200) => typeof v === "string" && !!v.trim() && v.length <= max;

function validBatch(v: unknown): v is CommunicationBatch {
  const b = v as CommunicationBatch;
  return !!b && str(b.id) && str(b.executiveId) && typeof b.title === "string" && b.title.length <= 300 && Array.isArray(b.items) && b.items.length <= 50 &&
    b.items.every(i => i && str(i.id) && (i.kind === "question" || i.kind === "information") && typeof i.title === "string" && i.title.length <= 1000 && Array.isArray(i.choices) && i.choices.length <= 10);
}
function validAction(a: unknown): a is ResponseAction {
  const x = a as ResponseAction;
  if (!x || typeof x !== "object") return false;
  if (x.kind === "answer") return str(x.choiceId);
  if (x.kind === "delegate") return str(x.contactId);
  return x.kind === "call_asap" || x.kind === "discuss_later" || x.kind === "acknowledge";
}

async function loadBatch(id: string) {
  const row = await db().prepare("SELECT batch_json FROM decision_batches WHERE id = ?").bind(id).first<{ batch_json: string }>();
  return row ? JSON.parse(row.batch_json) as CommunicationBatch : null;
}
async function saveBatch(b: CommunicationBatch) {
  await db().prepare("INSERT INTO decision_batches (id, executive_id, batch_json, status, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET batch_json = excluded.batch_json, status = excluded.status, updated_at = excluded.updated_at")
    .bind(b.id, b.executiveId, JSON.stringify(b), b.status, new Date().toISOString()).run();
  return b;
}

export async function GET(request: Request) {
  const executiveId = new URL(request.url).searchParams.get("executive") ?? "";
  if (!str(executiveId)) return bad("Choose an executive.");
  try {
    const rows = await db().prepare("SELECT batch_json FROM decision_batches WHERE executive_id = ? ORDER BY updated_at DESC").bind(executiveId).all<{ batch_json: string }>();
    const batches = rows.results.map(r => JSON.parse(r.batch_json) as CommunicationBatch);
    const ids = batches.map(b => b.id);
    let responses: SavedItemResponse[] = [];
    if (ids.length) {
      const resp = await db().prepare(`SELECT id, batch_id, item_id, action_json, recorded_at FROM decision_responses WHERE batch_id IN (${ids.map(() => "?").join(",")}) ORDER BY recorded_at`).bind(...ids).all<{ id: string; batch_id: string; item_id: string; action_json: string; recorded_at: string }>();
      responses = resp.results.map(r => ({ id: r.id, batchId: r.batch_id, itemId: r.item_id, action: JSON.parse(r.action_json), recordedAt: r.recorded_at }));
    }
    return Response.json({ batches, responses }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { console.error("Decision queue load failed", e); return bad("The decision queue could not load. Try again.", 503); }
}

export async function POST(request: Request) {
  let body: { op?: string; batch?: unknown; batchId?: unknown; intent?: unknown; itemId?: unknown; action?: unknown };
  try { body = await request.json(); } catch { return bad("The request was not valid."); }
  try {
    if (body.op === "save") {
      if (!validBatch(body.batch)) return bad("This queue has invalid content.");
      const existing = await loadBatch(body.batch.id);
      if (existing && existing.status !== "draft") return bad("This queue is already scheduled and can no longer be edited.", 409);
      return Response.json(await saveBatch({ ...body.batch, status: "draft" }));
    }
    if (body.op === "schedule") {
      if (!str(body.batchId)) return bad("Choose a saved queue.");
      const b = await loadBatch(body.batchId as string);
      if (!b) return bad("Save the queue before scheduling.", 404);
      if (!b.items.length) return bad("Add at least one item first.");
      const intent = body.intent as DeliveryIntent;
      if (!intent || !["now", "custom", "flight"].includes(intent.kind)) return bad("Choose when to deliver.");
      // "now" marks it delivered so the in-workspace preview can play it; nothing is sent to anyone.
      return Response.json(await saveBatch({ ...b, deliveryIntent: intent, status: intent.kind === "now" ? "delivered" : "scheduled" }));
    }
    if (body.op === "respond") {
      if (!str(body.batchId) || !str(body.itemId) || !validAction(body.action)) return bad("This response is not valid.");
      const b = await loadBatch(body.batchId as string);
      if (!b || !b.items.some(i => i.id === body.itemId)) return bad("This question is no longer available.", 404);
      if (b.status !== "delivered" && b.status !== "completed") return bad("This queue has not been delivered yet.", 409);
      const saved: SavedItemResponse = { id: crypto.randomUUID(), batchId: b.id, itemId: body.itemId as string, action: body.action as ResponseAction, recordedAt: new Date().toISOString() };
      await db().prepare("INSERT INTO decision_responses (id, batch_id, item_id, action_json, recorded_at) VALUES (?, ?, ?, ?, ?)").bind(saved.id, saved.batchId, saved.itemId, JSON.stringify(saved.action), saved.recordedAt).run();
      return Response.json(saved);
    }
    return bad("Unknown request.");
  } catch (e) { console.error("Decision queue write failed", e); return bad("That could not save. Your edits are still here; try again.", 503); }
}
