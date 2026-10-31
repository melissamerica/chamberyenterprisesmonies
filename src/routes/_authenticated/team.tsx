import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTeam, inviteMember, revokeInvite, updateMember, updateFirmSso } from "@/lib/firm.functions";
import { useFirm } from "@/hooks/use-firm";
import { FirmBar } from "@/components/site/firm-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignableRoles, canManageMembers, roleDescriptions, roleLabels, type FirmRole } from "@/lib/firm-roles";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & access — Chambery" },
      { name: "description", content: "Manage who in your firm can use Anya, their roles, and single sign-on." },
      { property: "og:title", content: "Team & access" },
      { property: "og:description", content: "Manage your firm's team and roles." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const firm = useFirm();
  const list = useServerFn(listTeam);
  const team = useQuery({ queryKey: ["team"], queryFn: () => list(), enabled: !!firm.data });
  const invite = useServerFn(inviteMember);
  const revoke = useServerFn(revokeInvite);
  const update = useServerFn(updateMember);
  const sso = useServerFn(updateFirmSso);
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (firm.isPending) return <div className="min-h-screen bg-cream" />;
  if (!firm.data) return <Navigate to="/onboarding" />;
  const myRole = firm.data.role;
  const manager = canManageMembers(myRole);
  const grantable = assignableRoles(myRole);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setError(""); setNotice("");
    try { await fn(); await qc.invalidateQueries({ queryKey: ["team"] }); await qc.invalidateQueries({ queryKey: ["my-firm"] }); if (ok) setNotice(ok); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
  }

  return (
    <div className="min-h-screen bg-cream font-brand text-ink">
      <FirmBar name={firm.data.name} role={myRole} />
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="eyebrow">{firm.data.name}</p>
        <h1 className="mt-3 font-display text-4xl">Team &amp; access</h1>
        {error && <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        {notice && <p className="mt-6 rounded-lg bg-blush px-4 py-3 text-sm text-plum-deep">{notice}</p>}

        {manager && (
          <form className="mt-10 grid gap-4 rounded-2xl border border-hairline bg-card p-6 sm:grid-cols-[1fr_180px_auto] sm:items-end"
            onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const form = e.currentTarget;
              void run(() => invite({ data: { email: String(f.get("email")), role: String(f.get("role")) as FirmRole } }), "Invite saved. They'll join your firm the first time they sign in with that email.").then(() => form.reset()); }}>
            <div className="space-y-2"><Label htmlFor="email">Invite by work email</Label><Input id="email" name="email" type="email" required /></div>
            <div className="space-y-2"><Label htmlFor="role">Role</Label>
              <select id="role" name="role" defaultValue="editor" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {grantable.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select>
            </div>
            <Button type="submit" variant="pill">Send invite</Button>
          </form>
        )}

        <section className="mt-10">
          <h2 className="font-semibold">Members</h2>
          <div className="mt-4 divide-y divide-hairline rounded-2xl border border-hairline bg-card">
            {team.data?.members.map((m) => {
              const editable = manager && m.user_id !== team.data.me && grantable.includes(m.role as FirmRole);
              return (
                <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div><p className="text-sm font-medium">{m.email}{m.user_id === team.data.me && <span className="text-sage"> (you)</span>}</p><p className="text-xs text-sage">{roleDescriptions[m.role as FirmRole]}</p></div>
                  {editable ? (
                    <div className="flex items-center gap-2">
                      <select aria-label={`Role for ${m.email}`} value={m.role} onChange={(e) => void run(() => update({ data: { userId: m.user_id, role: e.target.value as FirmRole } }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                        {grantable.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => void run(() => update({ data: { userId: m.user_id, role: null } }), "Member removed.")}>Remove</Button>
                    </div>
                  ) : <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs text-plum-deep">{roleLabels[m.role as FirmRole]}</span>}
                </div>
              );
            })}
            {team.isPending && <p className="px-5 py-4 text-sm text-sage">Loading…</p>}
          </div>
        </section>

        {manager && !!team.data?.invites.length && (
          <section className="mt-10">
            <h2 className="font-semibold">Pending invites</h2>
            <div className="mt-4 divide-y divide-hairline rounded-2xl border border-hairline bg-card">
              {team.data.invites.map((i) => (
                <div key={i.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>{i.email} · <span className="text-sage">{roleLabels[i.role as FirmRole]}</span></span>
                  <Button size="sm" variant="ghost" onClick={() => void run(() => revoke({ data: { id: i.id } }))}>Revoke</Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {manager && (
          <section className="mt-10 rounded-2xl border border-hairline bg-card p-6">
            <h2 className="font-semibold">Company single sign-on</h2>
            <p className="mt-2 text-sm text-sage">Your team can choose "Continue with company SSO" and enter their work email. Connecting your identity provider (Okta, Microsoft Entra ID and others) is done with Chambery during onboarding — send us your SAML metadata URL and email domain.</p>
            <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("domain") || "").trim(); void run(() => sso({ data: { domain: v || null } }), "Single sign-on domain saved."); }}>
              <div className="space-y-2"><Label htmlFor="domain">Email domain</Label><Input id="domain" name="domain" defaultValue={firm.data.ssoDomain ?? ""} placeholder="yourfirm.com" disabled={myRole !== "owner"} /></div>
              <Button type="submit" variant="hairline" disabled={myRole !== "owner"}>Save</Button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
