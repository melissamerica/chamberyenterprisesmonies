import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearWorkspaceCacheForUser } from "@/lib/workspace-cache";
import { ChamberyWordmark } from "./brand";
import { roleLabels, canManageMembers, type FirmRole } from "@/lib/firm-roles";

export function FirmBar({ name, role }: { name: string; role: FirmRole }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    const { data } = await supabase.auth.getUser();
    if (data.user && typeof window !== "undefined") clearWorkspaceCacheForUser(window.localStorage, data.user.id);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline bg-cream px-5 py-2 font-brand text-sm text-ink">
      <div className="flex items-center gap-4">
        <Link to="/" aria-label="Chambery home"><ChamberyWordmark size="sm" withSub={false} className="[&>span]:text-xl" /></Link>
        <span className="text-sage">{name}</span>
        <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs text-plum-deep">{roleLabels[role]}</span>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/app" search={{ view: "home" } as never} className="text-sage hover:text-ink">Workspace</Link>
        <Link to="/team" className="inline-flex items-center gap-1.5 text-sage hover:text-ink"><Users className="size-4" />{canManageMembers(role) ? "Team & SSO" : "Team"}</Link>
        <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 text-sage hover:text-ink"><LogOut className="size-4" />Sign out</button>
      </div>
    </div>
  );
}
