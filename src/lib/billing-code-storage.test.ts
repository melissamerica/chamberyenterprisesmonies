import { beforeEach, describe, expect, it, vi } from "vitest";

type RecordRow = { id: string; code: string; code_key: string; label: string; active: number; updated_at: string; executive_ids_json: string };
const state = vi.hoisted(() => ({ codes: new Map<string, RecordRow>() }));

vi.mock("./upload-storage", () => ({
  uploadDatabase() {
    return {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            return {
              async first() {
                if (sql.includes("SELECT updated_at, executive_ids_json")) {
                  const record = state.codes.get(String(args[0]));
                  return record ? { updated_at: record.updated_at, executive_ids_json: record.executive_ids_json } : null;
                }
                if (sql.includes("SELECT id FROM billing_codes WHERE code_key")) {
                  const matching = [...state.codes.values()].find(value => value.code_key === args[0]);
                  return matching ? { id: matching.id } : null;
                }
                throw new Error("Unexpected billing lookup");
              },
              async run() {
                if (sql.startsWith("INSERT")) {
                  const [id, code, key, label, active, updatedAt, executiveIds] = args.map(String);
                  if (state.codes.has(id) || [...state.codes.values()].some(value => value.code_key === key))
                    return { meta: { changes: 0 } };
                  state.codes.set(id, { id, code, code_key: key, label, active: Number(active), updated_at: updatedAt, executive_ids_json: executiveIds });
                  return { meta: { changes: 1 } };
                }
                if (sql.startsWith("UPDATE")) {
                  const [code, key, label, active, updatedAt, executiveIds, id, expected] = args.map(String);
                  const previous = state.codes.get(id);
                  if (!previous || previous.updated_at !== expected) return { meta: { changes: 0 } };
                  state.codes.set(id, { id, code, code_key: key, label, active: Number(active), updated_at: updatedAt, executive_ids_json: executiveIds });
                  return { meta: { changes: 1 } };
                }
                throw new Error("Unexpected billing mutation");
              },
            };
          },
        };
      },
    };
  },
}));

import { writeBillingCode } from "./billing-code-storage";

beforeEach(() => state.codes.clear());

describe("manual billing code revisions", () => {
  it("creates, updates, and rejects an older edit without overwriting", async () => {
    const created = await writeBillingCode({ code: "A100", label: "Consulting", active: true });
    expect(created.updatedAt).toBeTruthy();
    const renamed = await writeBillingCode({
      id: created.id, code: "A100", label: "Client consulting", active: true,
      expectedUpdatedAt: created.updatedAt,
    });
    expect(renamed.updatedAt).not.toEqual(created.updatedAt);
    await expect(writeBillingCode({
      id: created.id, code: "A100", label: "Stale overwrite", active: false,
      expectedUpdatedAt: created.updatedAt,
    })).rejects.toThrow("changed in another session");
    expect(state.codes.get(created.id)?.label).toBe("Client consulting");
  });

  it("does not allow a duplicate code to replace the original", async () => {
    const original = await writeBillingCode({ code: "A100", label: "Consulting", active: true });
    await expect(writeBillingCode({ code: "a100", label: "Fake replacement", active: true }))
      .rejects.toThrow("already exists");
    expect(state.codes.size).toBe(1);
    expect(state.codes.get(original.id)?.label).toBe("Consulting");
  });

  it("requires a prior revision before changing an existing code", async () => {
    const created = await writeBillingCode({ code: "A100", label: "Consulting", active: true });
    await expect(writeBillingCode({ id: created.id, code: "A100", label: "Changed", active: true }))
      .rejects.toThrow("changed in another session");
  });
});
