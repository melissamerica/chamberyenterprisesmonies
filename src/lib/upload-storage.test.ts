import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadTrip } from "./workspace-uploads";

const state = vi.hoisted(() => ({
  rows: new Map<string, { json: string; revision: string }>(),
}));

vi.mock("@/server/runtime-env", () => ({
  env: {
    DB: {
      async batch(statements: Array<{ sql: string; args: unknown[] }>) {
        const first = statements[0];
        if (first.sql.includes("jsonb_array_elements")) {
          const payload = JSON.parse(String(first.args[0])) as Array<{
            tripId: string; expectedUpdatedAt: string | null; nextUpdatedAt: string; tripJson: string;
          }>;
          // Simulated transactional assertion: any mismatch rolls back the entire batch.
          if (payload.some(row => (state.rows.get(row.tripId)?.revision ?? null) !== row.expectedUpdatedAt))
            throw new Error("division by zero");
          payload.forEach(row => state.rows.set(row.tripId, { json: row.tripJson, revision: row.nextUpdatedAt }));
          return [{ meta: { changes: payload.length } }, { meta: { changes: 1 } }];
        }
        if (first.sql.startsWith("UPDATE executive_upload_trips") ||
            first.sql.startsWith("INSERT INTO executive_upload_trips")) {
          const id = first.sql.startsWith("UPDATE") ? String(first.args[3]) : String(first.args[0]);
          const previous = state.rows.get(id);
          const expected = first.sql.startsWith("UPDATE") ? String(first.args[5]) : null;
          if ((previous?.revision ?? null) !== expected) throw new Error("division by zero");
          const newJson = first.sql.startsWith("UPDATE") ? String(first.args[1]) : String(first.args[2]);
          const newRevision = first.sql.startsWith("UPDATE") ? String(first.args[2]) : String(first.args[3]);
          state.rows.set(id, { json: newJson, revision: newRevision });
          return statements.map(() => ({ meta: { changes: 1 } }));
        }
        return statements.map(() => ({ meta: { changes: 1 } }));
      },
      prepare(sql: string) {
        return {
          async all() {
            if (!sql.startsWith("SELECT trip_json")) throw new Error("Unexpected read");
            return { results: [...state.rows.values()].map(row => ({ trip_json: row.json, updated_at: row.revision })) };
          },
          bind(...args: unknown[]) {
            return {
              sql, args,
              async first() { return null; }, // No pending approval lock in these tests.
              async all() {
                if (!sql.startsWith("SELECT trip_json")) throw new Error("Unexpected read");
                return { results: [...state.rows.values()].map(row => ({ trip_json: row.json, updated_at: row.revision })) };
              },
              async run() {
                if (sql.startsWith("INSERT INTO executive_upload_trips")) {
                  const id = String(args[0]);
                  if (state.rows.has(id)) return { meta: { changes: 0 } };
                  state.rows.set(id, { json: String(args[2]), revision: String(args[3]) });
                  return { meta: { changes: 1 } };
                }
                if (sql.startsWith("UPDATE executive_upload_trips")) {
                  const id = String(args[3]);
                  const row = state.rows.get(id);
                  if (!row || row.revision !== args[4]) return { meta: { changes: 0 } };
                  state.rows.set(id, { json: String(args[1]), revision: String(args[2]) });
                  return { meta: { changes: 1 } };
                }
                throw new Error("Unexpected write");
              },
            };
          },
        };
      },
    },
  },
}));

import { savedUploadTrips, saveWorkspaceTrip, saveUploadTrips, saveUploadDecision } from "./upload-storage";

const draft: UploadTrip = {
  id: 501, executiveId: "exec1", name: "Denver",
  traveler: "Alex", dates: "Nov 4–6", route: "MIA → DEN", items: [],
};

beforeEach(() => { state.rows.clear(); });

describe("revision-aware server trip persistence", () => {
  it("creates a trip once and returns its saved revision", async () => {
    const first = await saveWorkspaceTrip(draft, null);
    expect(first?.updatedAt).toBeTruthy();
    expect(await saveWorkspaceTrip(draft, null)).toBeNull();
    expect((await savedUploadTrips())[0]).toMatchObject({ id: 501, name: "Denver", updatedAt: first!.updatedAt });
  });

  it("rejects a stale writer and preserves the current record", async () => {
    const first = await saveWorkspaceTrip(draft, null);
    const second = await saveWorkspaceTrip({ ...first!, name: "Updated on another device" }, first!.updatedAt!);
    expect(second?.name).toBe("Updated on another device");
    expect(await saveWorkspaceTrip({ ...first!, name: "Stale save" }, first!.updatedAt!)).toBeNull();
    expect((await savedUploadTrips())[0].name).toBe("Updated on another device");
    expect(second!.updatedAt).not.toEqual(first!.updatedAt);
  });

  it("never accepts an update to a trip missing from the server", async () => {
    expect(await saveWorkspaceTrip(draft, "2026-11-03T00:00:00.000Z")).toBeNull();
    expect((await savedUploadTrips())).toEqual([]);
  });
});

describe("all-or-nothing bulk trip saves", () => {
  it("imports two trips atomically with new server revisions", async () => {
    const a = await saveWorkspaceTrip(draft, null);
    const b = await saveWorkspaceTrip({ ...draft, id: 502, name: "Atlanta" }, null);
    const result = await saveUploadTrips([{ ...a!, name: "Denver updated" }, { ...b!, name: "Atlanta updated" }]);
    expect(result).toHaveLength(2);
    expect(result[0].updatedAt).not.toBe(a!.updatedAt);
    expect(result[1].updatedAt).not.toBe(b!.updatedAt);
    expect((await savedUploadTrips()).map(t => t.name).sort()).toEqual(["Atlanta updated", "Denver updated"]);
  });

  it("rolls back every trip when any revision is stale", async () => {
    const a = await saveWorkspaceTrip(draft, null);
    const b = await saveWorkspaceTrip({ ...draft, id: 502, name: "Atlanta" }, null);
    const updatedA = await saveWorkspaceTrip({ ...a!, name: "Other device edit" }, a!.updatedAt!);
    await expect(saveUploadTrips([{ ...a!, name: "Stale edit" }, { ...b!, name: "Should not save" }]))
      .rejects.toThrow("changed in another session");
    expect((await savedUploadTrips()).find(t => t.id === 501)?.name).toBe(updatedA!.name);
    expect((await savedUploadTrips()).find(t => t.id === 502)?.name).toBe("Atlanta");
  });

  it("rejects a same-ID create collision before changing the record", async () => {
    const a = await saveWorkspaceTrip(draft, null);
    await expect(saveUploadTrips([draft])).rejects.toThrow("changed in another session");
    expect((await savedUploadTrips())[0].updatedAt).toBe(a!.updatedAt);
  });
});

describe("individual receipt decisions", () => {
  const row = {
    key: "file-1:0", fileId: "file-1", kind: "expense" as const, source: "receipt.pdf",
    title: "Taxi", date: "2026-11-04", amount: "12", category: "Transportation",
    detail: "", location: "Denver", tripId: "501", match: "", duplicateChoice: "new",
  };
  it("updates the saved trip revision and rejects a stale duplicate decision", async () => {
    const initial = await saveWorkspaceTrip(draft, null);
    const assigned = await saveUploadDecision("exec1", row, { ...initial!, name: "Receipt included" }, undefined);
    expect(assigned.trips[0].updatedAt).toBeTruthy();
    expect(assigned.trips[0].updatedAt).not.toBe(initial!.updatedAt);
    await expect(saveUploadDecision("exec1", row, initial!, undefined)).rejects.toThrow("changed in another session");
    expect((await savedUploadTrips())[0].name).toBe("Receipt included");
  });
});
