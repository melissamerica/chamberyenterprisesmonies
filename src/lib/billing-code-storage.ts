import { uploadDatabase } from "./upload-storage";
import type { BillingCode } from "./billing-codes";
import { billingCodeKey, type BillingImportInput } from "./billing-code-import";

type StoredCode = { id: string; code: string; label: string; active: number; updated_at: string; executive_ids_json: string };
export async function readBillingCodes(): Promise<BillingCode[]> {
  const result = await uploadDatabase().prepare("SELECT id, code, label, active, updated_at, executive_ids_json FROM billing_codes ORDER BY active DESC, lower(code), id").all<StoredCode>();
  return result.results.map(row => ({ id: row.id, code: row.code, label: row.label, active: row.active === 1, updatedAt: row.updated_at, executiveIds: JSON.parse(row.executive_ids_json) as string[] }));
}
export async function writeBillingCode(input: { id?: string; code: string; label: string; active: boolean; executiveIds?: string[] }) {
  const db = uploadDatabase();
  const previous = input.id ? await db.prepare("SELECT executive_ids_json FROM billing_codes WHERE id = ?").bind(input.id).first<{executive_ids_json: string}>() : null;
  if (input.id && !previous) throw new Error("This billing code no longer exists. Refresh the list.");
  const value: BillingCode = { id: input.id ?? crypto.randomUUID(), code: input.code.trim(), label: input.label.trim(), active: input.active, updatedAt: new Date().toISOString(), executiveIds: input.executiveIds ?? (previous ? JSON.parse(previous.executive_ids_json) as string[] : []) };
  const existing = await db.prepare("SELECT id FROM billing_codes WHERE code_key = ?").bind(value.code.toLocaleLowerCase("en-US")).first<{ id: string }>();
  if (existing && existing.id !== value.id) throw new Error("That billing code already exists. Edit or restore the existing code.");
  await db.prepare("INSERT INTO billing_codes (id, code, code_key, label, active, updated_at, executive_ids_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET code = excluded.code, code_key = excluded.code_key, label = excluded.label, active = excluded.active, updated_at = excluded.updated_at, executive_ids_json = excluded.executive_ids_json").bind(value.id, value.code, value.code.toLocaleLowerCase("en-US"), value.label, value.active ? 1 : 0, value.updatedAt, JSON.stringify(value.executiveIds)).run();
  return value;
}

export async function importBillingCodes(rows: BillingImportInput[], executiveIds: string[]) {
  const existing = await readBillingCodes(), known = new Map(existing.map(code => [billingCodeKey(code.code), code]));
  const timestamp = new Date().toISOString();
  let added = 0, updated = 0;
  const values = rows.map(row => {
    const previous = known.get(billingCodeKey(row.code));
    if (previous ? row.expectedUpdatedAt !== previous.updatedAt : row.expectedUpdatedAt !== undefined) throw Error("The code list changed while you were reviewing. Reload billing codes and review the file again; nothing was imported.");
    if (previous) updated++; else added++;
    return {id: previous?.id ?? crypto.randomUUID(), code: row.code.trim(), code_key: billingCodeKey(row.code), label: row.label.trim(), active: previous ? Number(previous.active) : 1, updated_at: timestamp, executive_ids_json: JSON.stringify(Array.from(new Set([...(previous?.executiveIds ?? []), ...executiveIds]))), expectedUpdatedAt: previous?.updatedAt ?? null};
  });
  // One guarded statement makes the import all-or-nothing, including concurrent edits.
  const result = await uploadDatabase().prepare(`INSERT INTO billing_codes (id, code, code_key, label, active, updated_at, executive_ids_json)
    SELECT (incoming.value->>'id'), (incoming.value->>'code'), (incoming.value->>'code_key'), (incoming.value->>'label'), (incoming.value->>'active')::int, (incoming.value->>'updated_at'), (incoming.value->>'executive_ids_json') FROM jsonb_array_elements(?1::jsonb) AS incoming(value)
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(?1::jsonb) AS guard(value) LEFT JOIN billing_codes AS cur ON cur.code_key = (guard.value->>'code_key')
      WHERE ((guard.value->>'expectedUpdatedAt') IS NULL AND cur.id IS NOT NULL)
        OR ((guard.value->>'expectedUpdatedAt') IS NOT NULL AND (cur.id IS NULL OR cur.id != (guard.value->>'id') OR cur.updated_at != (guard.value->>'expectedUpdatedAt')))
    ) ON CONFLICT(id) DO UPDATE SET code = excluded.code, code_key = excluded.code_key, label = excluded.label, active = excluded.active, updated_at = excluded.updated_at, executive_ids_json = excluded.executive_ids_json RETURNING id`).bind(JSON.stringify(values)).all<{id: string}>();
  if (result.results.length !== rows.length) throw Error("The code list changed while you were reviewing. Reload billing codes and review the file again; nothing was imported.");
  return {codes: await readBillingCodes(), added, updated};
}
