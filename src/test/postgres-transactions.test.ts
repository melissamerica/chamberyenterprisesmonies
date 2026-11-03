/**
 * Real PostgreSQL smoke tests for the same SQL and transaction wrapper used
 * by the live application. Requires only a disposable local DB in CI.
 * Never connects to the Chambery production Supabase project.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import type { UploadTrip, UploadRow } from "@/lib/workspace-uploads";

type Statement = { sql: string; params: unknown[] };
type DatabaseResult = { results: Record<string, unknown>[]; changes: number };
const session = vi.hoisted(() => ({
  firmId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  execute: null as null | ((statements: Statement[]) => Promise<DatabaseResult[]>),
}));

vi.mock("@/server/runtime-env", () => {
  function prepare(sql: string, params: unknown[] = []) {
    return {
      sql, params,
      bind(...args: unknown[]) { return prepare(sql, args); },
      async first() {
        const [result] = await session.execute!([{ sql, params }]);
        return result.results[0] ?? null;
      },
      async all() {
        const [result] = await session.execute!([{ sql, params }]);
        return { results: result.results, meta: { changes: result.changes } };
      },
      async run() {
        const [result] = await session.execute!([{ sql, params }]);
        return { meta: { changes: result.changes } };
      },
    };
  }
  return { env: { DB: {
    prepare,
    async batch(statements: Statement[]) {
      const values = await session.execute!(statements);
      return values.map(value => ({ results: value.results, meta: { changes: value.changes } }));
    },
  } } };
});

import { saveWorkspaceTrip, saveUploadTrips, savedUploadTrips, saveUploadDecision, saveUnassignedUploads, savedUnassignedUploads } from "@/lib/upload-storage";
import { saveAttachment, reassignAttachment, attachmentTrip } from "@/lib/itinerary-attachment-storage";
import { approvalById, recordDecision } from "@/lib/expense-approval-storage";

const enabled = !!process.env.POSTGRES_TEST_URL;
const pgDescribe = enabled ? describe : describe.skip;
const firmA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const firmB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let admin: ReturnType<typeof postgres>;

function draft(id: number): UploadTrip {
  return {
    id, executiveId: "exec-alex", name: `Trip ${id}`, traveler: "Alex",
    dates: "2026-11-04", route: "MIA → DEN",
    items: [{ id: id * 10, kind: "Appointment", title: "Meeting", detail: "", date: "2026-11-04", time: "10:00" }],
  };
}

pgDescribe("disposable PostgreSQL transaction integration", () => {
  beforeAll(async () => {
    admin = postgres(process.env.POSTGRES_TEST_URL!, { max: 5, prepare: false });
    // Plain PostgreSQL does not include the built-in Supabase roles.
    for (const role of ["service_role", "anon", "authenticated"])
      await admin.unsafe(`CREATE ROLE ${role} NOLOGIN`).simple();
    for (const name of ["0000_migration.sql", "0001_firm_tenancy.sql"]) {
      const migration = readFileSync(`drizzle/migrations/${name}`, "utf8");
      await admin.unsafe(migration).simple();
    }
    session.execute = async (statements: Statement[]) => {
      const batch = statements.map(statement => ({
        sql: statement.sql,
        params: statement.params.map(value => value === undefined ? null : typeof value === "boolean" ? Number(value) : value),
        returns: /^\s*(select|with)\b/i.test(statement.sql) || /\breturning\b/i.test(statement.sql),
      }));
      const rows = await admin.unsafe("SELECT public.anya_exec($1::jsonb, $2::text) AS result",
        [admin.json(batch), session.firmId]);
      const result: unknown = rows[0].result;
      return (typeof result === "string" ? JSON.parse(result) : result) as DatabaseResult[];
    };
  }, 30_000);

  beforeEach(async () => {
    session.firmId = firmA;
    await admin.unsafe("TRUNCATE TABLE public.itinerary_attachments, public.executive_upload_trips, public.executive_upload_files, public.executive_unassigned_uploads CASCADE").simple();
  });

  afterAll(async () => {
    session.execute = null;
    if (admin) await admin.end({ timeout: 5 });
  });

  it("creates trips and commits a two-trip import with confirmed revisions", async () => {
    const a = await saveWorkspaceTrip(draft(701), null);
    const b = await saveWorkspaceTrip(draft(702), null);
    const saved = await saveUploadTrips([{ ...a!, name: "Denver trip" }, { ...b!, name: "Atlanta trip" }]);
    expect(saved.map(value => value.name)).toEqual(["Denver trip", "Atlanta trip"]);
    expect(saved.every(value => !!value.updatedAt)).toBe(true);
    const stored = await savedUploadTrips();
    expect(stored.map(value => value.name).sort()).toEqual(["Atlanta trip", "Denver trip"]);
  });

  it("rolls back every trip when one writer has a stale revision", async () => {
    const a = await saveWorkspaceTrip(draft(711), null);
    const b = await saveWorkspaceTrip(draft(712), null);
    await saveWorkspaceTrip({ ...a!, name: "Other session's update" }, a!.updatedAt!);
    await expect(saveUploadTrips([{ ...a!, name: "Stale" }, { ...b!, name: "Must not partially save" }]))
      .rejects.toThrow("changed in another session");
    const stored = await savedUploadTrips();
    expect(stored.find(value => value.id === 711)?.name).toBe("Other session's update");
    expect(stored.find(value => value.id === 712)?.name).toBe("Trip 712");
  });

  it("rolls back a stale receipt decision and preserves its saved trip", async () => {
    const original = await saveWorkspaceTrip(draft(721), null);
    const latest = await saveWorkspaceTrip({ ...original!, name: "Another EA changed this trip" }, original!.updatedAt!);
    const receipt: UploadRow = {
      key: "source-file:0", fileId: "source-file", source: "cab.pdf", kind: "expense",
      title: "Cab", date: "2026-11-04", amount: "20", category: "Transportation",
      detail: "", location: "Denver", tripId: "721", match: "", duplicateChoice: "new", selected: true,
    };
    await expect(saveUploadDecision("exec-alex", receipt, { ...original!, name: "Old receipt state" }, undefined))
      .rejects.toThrow("changed in another session");
    expect((await savedUploadTrips())[0].updatedAt).toBe(latest!.updatedAt);
  });

  it("saves attachment + trip materials and rejects an obsolete revision", async () => {
    const original = await saveWorkspaceTrip(draft(731), null);
    const saved = await saveAttachment(original!, { id: "attachment-1" }, 7310, 1200);
    expect(saved.items[0].materialsFormat).toBe("digital");
    const reloaded = await attachmentTrip(731, "exec-alex");
    expect(reloaded?.updatedAt).toBe(saved.updatedAt);
    await expect(saveAttachment(original!, { id: "attachment-2" }, 7310, 1200))
      .rejects.toThrow("changed in another session");
    const results = await admin.unsafe("SELECT id FROM public.itinerary_attachments WHERE trip_id = '731' ORDER BY id");
    expect(results.map(value => value.id)).toEqual(["attachment-1"]);
  });

  it("moves an attachment and updates the materials flag atomically", async () => {
    const original = await saveWorkspaceTrip(draft(741), null);
    const withFile = await saveAttachment(original!, { id: "attachment-10" }, 7410, 1200);
    const moved = await reassignAttachment(withFile, "attachment-10", 0, [
      { id: "attachment-10", tripId: 741, entryId: 7410,
        name: "Agenda.pdf", contentType: "application/pdf", byteCount: 1200, createdAt: "" },
    ]);
    expect(moved.items[0].materialsAttached).toBe(false);
    const results = await admin.unsafe("SELECT entry_id FROM public.itinerary_attachments WHERE id = 'attachment-10'");
    expect(results[0].entry_id).toBe("0");
  });

  it("allows only one of two simultaneous full-trip batch updates", async () => {
    const first = await saveWorkspaceTrip(draft(761), null);
    const second = await saveWorkspaceTrip(draft(762), null);
    const a = saveUploadTrips([{ ...first!, name: "A-761" }, { ...second!, name: "A-762" }]);
    const b = saveUploadTrips([{ ...first!, name: "B-761" }, { ...second!, name: "B-762" }]);
    const outcomes = await Promise.allSettled([a, b]);
    expect(outcomes.filter(value => value.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(value => value.status === "rejected")).toHaveLength(1);
    const stored = await savedUploadTrips();
    const names = stored.map(value => value.name);
    expect(names.sort().join(",")).toMatch(/^(A-761,A-762|B-761,B-762)$/);
  });

  it("allows only one of two concurrent attachment uploads to update a trip", async () => {
    const initial = await saveWorkspaceTrip(draft(771), null);
    const outcomes = await Promise.allSettled([
      saveAttachment(initial!, { id: "concurrent-A" }, 7710, 100),
      saveAttachment(initial!, { id: "concurrent-B" }, 7710, 100),
    ]);
    expect(outcomes.filter(value => value.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(value => value.status === "rejected")).toHaveLength(1);
    const rows = await admin.unsafe("SELECT id FROM public.itinerary_attachments WHERE trip_id = '771'");
    expect(rows).toHaveLength(1);
  });

  async function pendingApproval(tripId: number) {
    const report = { id: `expense-${tripId}`, createdAt: "2026-11-03T16:00:00.000Z" };
    const trip: UploadTrip = { ...draft(tripId), expenseReport: report };
    const saved = await saveWorkspaceTrip(trip, null);
    const id = `approval-${tripId}`;
    const snapshot = { trip: saved, templates: {}, reportHash: `hash-${tripId}` };
    await admin.unsafe(`INSERT INTO public.expense_approval_requests
      (firm_id,id,trip_id,executive_id,approver_email,token_hash,send_token_hash,
       snapshot_json,documents_json,status,clarification,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','',$10,$10)`,
      [session.firmId,id,String(tripId),"exec-alex","approver@example.test",
       `token-${tripId}`,`delivery-${tripId}`,JSON.stringify(snapshot),"[]",
       "2026-11-03T16:00:00.000Z"]);
    const record=await approvalById(id);
    if(!record)throw Error("Failed to create isolated test approval");
    return record;
  }

  it("updates the approval and corresponding trip signature atomically", async () => {
    const pending=await pendingApproval(781);
    const approved=await recordDecision(pending,"approve","Taylor Reviewer","");
    expect(approved.status).toBe("approved");
    expect(approved.signature_name).toBe("Taylor Reviewer");
    const trip=(await savedUploadTrips())[0];
    expect(trip.expenseReport?.approval?.status).toBe("approved");
    expect(trip.expenseReport?.approval?.reportHash).toBe("hash-781");
    expect(trip.expenseReport?.id).toBe("expense-781");
  });

  it("rolls back the approval status if its trip no longer exists", async () => {
    const pending=await pendingApproval(782);
    await admin.unsafe("DELETE FROM public.executive_upload_trips WHERE trip_id = $1",[String(782)]);
    await expect(recordDecision(pending,"approve","Taylor Reviewer","")).rejects.toThrow("Nothing was approved");
    expect((await approvalById(pending.id))?.status).toBe("pending");
  });

  it("rejects a second decision without changing the signed report", async () => {
    const pending=await pendingApproval(783);
    const outcomes=await Promise.allSettled([
      recordDecision(pending,"approve","Taylor Reviewer",""),
      recordDecision(pending,"return","","Please add documentation"),
    ]);
    expect(outcomes.filter(outcome=>outcome.status==="fulfilled")).toHaveLength(1);
    expect(outcomes.filter(outcome=>outcome.status==="rejected")).toHaveLength(1);
    const record=await approvalById(pending.id);
    const trip=(await savedUploadTrips())[0];
    expect(record?.status==="approved"||record?.status==="returned").toBe(true);
    expect(trip.expenseReport?.approval?.status==="approved").toBe(record?.status==="approved");
  });

  const pendingReceipt=(fileId:string):UploadRow=>({
    key:`${fileId}:0`,fileId,source:"cab.pdf",kind:"expense",title:"Taxi",date:"2026-11-04",
    amount:"20",category:"Transportation",detail:"",location:"Denver",tripId:"",
    match:"",duplicateChoice:"new",selected:false,
  });

  it("does not resurrect a receipt already assigned to a trip", async () => {
    const row=pendingReceipt("file-previously-assigned");
    const first=await saveUnassignedUploads("exec-alex","Alex",[row]);
    expect(first).toHaveLength(1);
    const trip=draft(791);
    trip.items.push({id:79101,kind:"Expense",title:"Taxi",detail:"",date:"2026-11-04",time:"",
      cost:20,importKey:row.key,sourceFileId:row.fileId});
    await saveWorkspaceTrip(trip,null);
    // The import may be delayed in another tab; it must not recreate review entries.
    await admin.unsafe("DELETE FROM public.executive_unassigned_uploads WHERE id = $1",[row.key]);
    const saved=await saveUnassignedUploads("exec-alex","Alex",[row]);
    expect(saved).toHaveLength(0);
    expect(await savedUnassignedUploads()).toHaveLength(0);
  });

  it("does not resurrect deferred or excluded receipt decisions", async () => {
    const deferred=pendingReceipt("file-deferred");
    const excluded=pendingReceipt("file-excluded");
    await admin.unsafe(`INSERT INTO public.executive_deferred_uploads
      (firm_id,id,executive_id,row_json,updated_at) VALUES ($1,$2,$3,$4,$5)`,
      [session.firmId,deferred.key,"exec-alex",JSON.stringify(deferred),"2026-11-03T15:00:00Z"]);
    await admin.unsafe(`INSERT INTO public.executive_upload_exclusions
      (firm_id,id,executive_id,source_file_id,row_json,approved_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [session.firmId,excluded.key,"exec-alex",excluded.fileId,JSON.stringify(excluded),"2026-11-03T15:00:00Z"]);
    const saved=await saveUnassignedUploads("exec-alex","Alex",[deferred,excluded]);
    expect(saved).toHaveLength(0);
    expect(await savedUnassignedUploads()).toHaveLength(0);
  });

  it("keeps data in a different firm invisible", async () => {
    await saveWorkspaceTrip(draft(751), null);
    session.firmId = firmB;
    expect(await savedUploadTrips()).toEqual([]);
  });
});
