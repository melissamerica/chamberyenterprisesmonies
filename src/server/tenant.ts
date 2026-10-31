// Per-request firm context. Every workspace API call is resolved to exactly one firm,
// from the caller's verified session, before any data access happens.
import { AsyncLocalStorage } from "node:async_hooks";

export type FirmRole = "owner" | "admin" | "editor" | "viewer";
export type Tenant = { firmId: string; role: FirmRole; userId: string | null };

const storage = new AsyncLocalStorage<Tenant>();

export function currentTenant(): Tenant {
  const t = storage.getStore();
  if (!t) throw new Error("No firm context for this request.");
  return t;
}

export function runAsTenant<T>(tenant: Tenant, fn: () => Promise<T>): Promise<T> {
  return storage.run(tenant, fn);
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Verifies the bearer token and returns the caller's firm membership, or null. */
export async function tenantFromRequest(request: Request): Promise<Tenant | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const db = await admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: rows } = await db
    .from("firm_members")
    .select("firm_id, role, created_at")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: true });
  if (!rows?.length) return null;
  const wanted = request.headers.get("x-firm-id");
  const row = rows.find((r) => r.firm_id === wanted) ?? rows[0]!;
  return { firmId: row.firm_id, role: row.role as FirmRole, userId: data.user.id };
}

const json = (status: number, error: string) => Response.json({ error }, { status });

/** Wraps a ported workspace handler: requires a signed-in firm member; viewers are read-only. */
export async function withTenant(request: Request, handler: () => Promise<Response>): Promise<Response> {
  const tenant = await tenantFromRequest(request);
  if (!tenant) return json(401, "Sign in to your firm workspace to continue.");
  if (tenant.role === "viewer" && request.method !== "GET") return json(403, "Your role is view-only. Ask a firm admin for edit access.");
  return runAsTenant(tenant, handler);
}

async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Approver links carry a token instead of a session: resolve the firm from the token hash. */
export async function withApprovalToken(request: Request, token: string, handler: () => Promise<Response>): Promise<Response> {
  const signedIn = await tenantFromRequest(request);
  if (signedIn) return runAsTenant(signedIn, handler);
  if (!token || token.length > 200) return json(404, "This approval link is unavailable.");
  const hash = await sha256(token);
  const db = await admin();
  const { data } = await db
    .from("expense_approval_requests")
    .select("firm_id")
    .or(`token_hash.eq.${hash},send_token_hash.eq.${hash}`)
    .limit(1)
    .maybeSingle();
  if (!data) return json(404, "This approval link is unavailable.");
  return runAsTenant({ firmId: data.firm_id, role: "viewer", userId: null }, handler);
}
