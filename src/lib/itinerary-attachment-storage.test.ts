import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadTrip } from "./workspace-uploads";

const dbState = vi.hoisted(() => ({
  permitWrite: true,
  queries: [] as Array<{ sql: string; args: unknown[] }>,
}));

vi.mock("@/server/runtime-env", () => ({
  env: {
    DB: {
      prepare(sql: string) {
        return { bind(...args: unknown[]) { return { sql, args }; } };
      },
      async batch(statements: Array<{ sql: string; args: unknown[] }>) {
        dbState.queries = statements;
        const success = dbState.permitWrite ? 1 : 0;
        return [{ meta: { changes: success } }, { meta: { changes: success } }];
      },
    },
  },
}));

import { saveAttachment, reassignAttachment, attachmentMaterials } from "./itinerary-attachment-storage";

const revision = "2026-11-03T19:00:00.000Z";
const trip: UploadTrip = {
  id: 501, executiveId: "executive-1", traveler: "Alex",
  name: "Denver", route: "MIA → DEN", dates: "Nov 4-6",
  updatedAt: revision, items: [
    { id: 77, kind: "Appointment", title: "Conference", detail: "", date: "2026-11-04", time: "10:00" },
    { id: 78, kind: "Appointment", title: "Dinner", detail: "", date: "2026-11-04", time: "19:00" },
  ],
};

beforeEach(() => {
  dbState.permitWrite = true;
  dbState.queries = [];
});

describe("atomic itinerary attachment writes", () => {
  it("writes attachment and trip in one locked transaction with a returned revision", async () => {
    const result = await saveAttachment(trip, { id: "file-a" }, 77, 1200);
    expect(result.updatedAt).not.toBe(revision);
    expect(result.items[0].materialsFormat).toBe("digital");
    expect(dbState.queries).toHaveLength(2);
    expect(dbState.queries[0].sql).toContain("FOR UPDATE OF t");
    expect(dbState.queries[1].sql).toContain("updated_at = ?");
    expect(dbState.queries[1].args.at(-1)).toBe(revision);
  });

  it("returns a conflict without claiming a stale file was saved", async () => {
    dbState.permitWrite = false;
    await expect(saveAttachment(trip, { id: "file-a" }, 77, 1200)).rejects.toThrow("changed in another session");
  });

  it("reassigns attachments with a locked trip revision", async () => {
    const original = attachmentMaterials(trip, 77, 1);
    const result = await reassignAttachment(original, "file-a", 78, [
      { id: "file-a", tripId: 501, entryId: 77, name: "Notes.pdf", contentType: "application/pdf", byteCount: 1200, createdAt: "" },
    ]);
    expect(result.items[0].materialsAttached).toBe(false);
    expect(result.items[1].materialsFormat).toBe("digital");
    expect(dbState.queries[0].sql).toContain("FOR UPDATE");
    expect(dbState.queries[1].args.at(-1)).toBe(revision);
  });

  it("rejects a stale reassignment", async () => {
    dbState.permitWrite = false;
    await expect(reassignAttachment(trip, "file-a", 78, [
      { id: "file-a", tripId: 501, entryId: 77, name: "Notes.pdf", contentType: "application/pdf", byteCount: 1200, createdAt: "" },
    ])).rejects.toThrow("changed in another session");
  });
});
