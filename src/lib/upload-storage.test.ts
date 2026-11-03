import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadTrip } from "./workspace-uploads";

const state = vi.hoisted(() => ({
  rows: new Map<string, { json: string; revision: string }>(),
}));

vi.mock("@/server/runtime-env", () => ({
  env: {
    DB: {
      prepare(sql: string) {
        return {
          async all() {
            if (!sql.startsWith("SELECT trip_json")) throw new Error("Unexpected read");
            return { results: [...state.rows.values()].map(row => ({ trip_json: row.json, updated_at: row.revision })) };
          },
          bind(...args: unknown[]) {
            return {
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

import { savedUploadTrips, saveWorkspaceTrip } from "./upload-storage";

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
