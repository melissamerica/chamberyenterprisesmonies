// Server-only replacement for the Cloudflare `env` bindings used by the original app.
// DB mirrors the D1 prepare/bind/first/all/run/batch API on top of Lovable Cloud (Postgres),
// executed atomically through the service-role-only `anya_exec` database function.
// BUCKET mirrors the R2 put/get/delete API on top of the private "anya-files" storage bucket.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Param = string | number | boolean | null | undefined;
type ExecResult = { results: Record<string, unknown>[]; changes: number };

const returnsRows = (sql: string) => /^\s*(select|with)\b/i.test(sql) || /\breturning\b/i.test(sql);

async function exec(statements: PreparedStatement[]): Promise<ExecResult[]> {
  const batch = statements.map((s) => ({
    sql: s.sql,
    params: s.params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p)),
    returns: returnsRows(s.sql),
  }));
  const { data, error } = await (supabaseAdmin.rpc as unknown as (fn: string, args: unknown) => Promise<{ data: unknown; error: { message: string } | null }>)("anya_exec", { batch });
  if (error) throw new Error(error.message);
  return data as ExecResult[];
}

export class PreparedStatement {
  params: Param[] = [];
  constructor(public sql: string) {}
  bind(...values: Param[]) { const next = new PreparedStatement(this.sql); next.params = values; return next; }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const [r] = await exec([this]); const row = r?.results[0];
    if (!row) return null; return (column ? (row[column] as T) : (row as T));
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: true; meta: { changes: number } }> {
    const [r] = await exec([this]); return { results: (r?.results ?? []) as T[], success: true, meta: { changes: r?.changes ?? 0 } };
  }
  async run() { const [r] = await exec([this]); return { success: true as const, results: r?.results ?? [], meta: { changes: r?.changes ?? 0 } }; }
}

const DB = {
  prepare: (sql: string) => new PreparedStatement(sql),
  batch: async (statements: PreparedStatement[]) => {
    if (!statements.length) return [];
    const results = await exec(statements);
    return results.map((r) => ({ success: true as const, results: r.results, meta: { changes: r.changes } }));
  },
};

const BUCKET_NAME = "anya-files";
const BUCKET = {
  async put(key: string, value: ArrayBuffer | Uint8Array | string | Blob, options?: { httpMetadata?: { contentType?: string } }) {
    const contentType = options?.httpMetadata?.contentType ?? (typeof value === "string" ? "text/plain" : "application/octet-stream");
    const body = typeof value === "string" ? new Blob([value], { type: contentType }) : value instanceof Blob ? value : new Blob([value as BlobPart], { type: contentType });
    const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(key, body, { contentType, upsert: true });
    if (error) throw new Error(error.message);
  },
  async get(key: string) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(key);
    if (error || !data) return null;
    const blob = data;
    return {
      get body() { return blob.stream(); },
      arrayBuffer: () => blob.arrayBuffer(),
      text: () => blob.text(),
      httpMetadata: { contentType: blob.type },
      size: blob.size,
    };
  },
  async delete(key: string | string[]) {
    await supabaseAdmin.storage.from(BUCKET_NAME).remove(Array.isArray(key) ? key : [key]);
  },
};

// Other bindings (webhook URLs, email connection) come from server secrets.
export const env = new Proxy({} as Record<string, unknown> & { DB: typeof DB; BUCKET: typeof BUCKET }, {
  get(_t, prop: string) {
    if (prop === "DB") return DB;
    if (prop === "BUCKET") return BUCKET;
    return process.env[prop];
  },
});

declare global {
  type D1PreparedStatement = PreparedStatement;
}
