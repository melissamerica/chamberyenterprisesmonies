import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageMembers, assignableRoles, type FirmRole } from "@/lib/firm-roles";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function verifiedEmail(userId: string) {
  const db = await admin();
  const { data } = await db.auth.admin.getUserById(userId);
  const u = data.user;
  return u?.email && u.email_confirmed_at ? u.email.toLowerCase() : null;
}

async function membership(userId: string) {
  const db = await admin();
  const { data } = await db.from("firm_members").select("firm_id, role, firms(name, sso_domain)").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
  return data;
}

/** Returns the caller's firm; accepts a pending invite for their verified email first. */
export const getMyFirm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    let m = await membership(context.userId);
    if (!m) {
      const email = await verifiedEmail(context.userId);
      if (email) {
        const { data: invite } = await db.from("firm_invites").select("id, firm_id, role").eq("email", email).order("created_at").limit(1).maybeSingle();
        if (invite) {
          await db.from("firm_members").insert({ firm_id: invite.firm_id, user_id: context.userId, email, role: invite.role });
          await db.from("firm_invites").delete().eq("id", invite.id);
          m = await membership(context.userId);
        }
      }
    }
    if (!m) return null;
    const firm = m.firms as unknown as { name: string; sso_domain: string | null } | null;
    return { firmId: m.firm_id, role: m.role as FirmRole, name: firm?.name ?? "", ssoDomain: firm?.sso_domain ?? null };
  });

export const createFirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().trim().min(2).max(120) }))
  .handler(async ({ context, data }) => {
    if (await membership(context.userId)) throw new Error("You already belong to a firm.");
    const email = await verifiedEmail(context.userId);
    if (!email) throw new Error("Confirm your email address before creating a firm.");
    const db = await admin();
    const { data: firm, error } = await db.from("firms").insert({ name: data.name }).select("id").single();
    if (error || !firm) throw new Error("The firm could not be created.");
    await db.from("firm_members").insert({ firm_id: firm.id, user_id: context.userId, email, role: "owner" });
    return { firmId: firm.id };
  });

async function requireManager(userId: string) {
  const m = await membership(userId);
  if (!m || !canManageMembers(m.role as FirmRole)) throw new Error("Only firm owners and admins can manage the team.");
  return { firmId: m.firm_id, role: m.role as FirmRole };
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await membership(context.userId);
    if (!m) throw new Error("No firm.");
    const db = await admin();
    const [{ data: members }, { data: invites }] = await Promise.all([
      db.from("firm_members").select("user_id, email, role, created_at").eq("firm_id", m.firm_id).order("created_at"),
      db.from("firm_invites").select("id, email, role, created_at").eq("firm_id", m.firm_id).order("created_at"),
    ]);
    return { members: members ?? [], invites: canManageMembers(m.role as FirmRole) ? invites ?? [] : [], myRole: m.role as FirmRole, me: context.userId };
  });

const roleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ email: z.string().trim().toLowerCase().email().max(255), role: roleSchema }))
  .handler(async ({ context, data }) => {
    const me = await requireManager(context.userId);
    if (!assignableRoles(me.role).includes(data.role)) throw new Error("You can't assign that role.");
    const db = await admin();
    const { error } = await db.from("firm_invites").upsert({ firm_id: me.firmId, email: data.email, role: data.role, invited_by: context.userId }, { onConflict: "firm_id,email" });
    if (error) throw new Error("The invite could not be saved.");
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const me = await requireManager(context.userId);
    await (await admin()).from("firm_invites").delete().eq("id", data.id).eq("firm_id", me.firmId);
    return { ok: true };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), role: roleSchema.nullable() }))
  .handler(async ({ context, data }) => {
    const me = await requireManager(context.userId);
    if (data.userId === context.userId) throw new Error("You can't change your own access.");
    const db = await admin();
    const { data: target } = await db.from("firm_members").select("role").eq("firm_id", me.firmId).eq("user_id", data.userId).maybeSingle();
    if (!target) throw new Error("Member not found.");
    if (!assignableRoles(me.role).includes(target.role as FirmRole)) throw new Error("You can't change this member.");
    if (data.role === null) {
      await db.from("firm_members").delete().eq("firm_id", me.firmId).eq("user_id", data.userId);
    } else {
      if (!assignableRoles(me.role).includes(data.role)) throw new Error("You can't assign that role.");
      await db.from("firm_members").update({ role: data.role }).eq("firm_id", me.firmId).eq("user_id", data.userId);
    }
    return { ok: true };
  });

export const updateFirmSso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ domain: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/).max(253).nullable() }))
  .handler(async ({ context, data }) => {
    const me = await requireManager(context.userId);
    if (me.role !== "owner") throw new Error("Only the firm owner can change single sign-on.");
    await (await admin()).from("firms").update({ sso_domain: data.domain }).eq("id", me.firmId);
    return { ok: true };
  });

/** Public: "Contact sales" / demo request form. */
export const submitDemoRequest = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    company: z.string().trim().min(1).max(160),
    teamSize: z.string().trim().max(40).optional(),
    product: z.string().trim().max(40).optional(),
    message: z.string().trim().max(2000).optional(),
  }))
  .handler(async ({ data }) => {
    const { error } = await (await admin()).from("demo_requests").insert({ name: data.name, email: data.email, company: data.company, team_size: data.teamSize ?? null, product: data.product ?? null, message: data.message ?? null });
    if (error) throw new Error("Your request could not be sent. Please try again.");
    return { ok: true };
  });
