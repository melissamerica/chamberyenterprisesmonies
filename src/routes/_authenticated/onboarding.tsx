import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFirm } from "@/lib/firm.functions";
import { useFirm } from "@/hooks/use-firm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChamberyWordmark } from "@/components/site/brand";
import cat from "@/assets/anya-cat.png";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your firm — Chambery" },
      { name: "description", content: "Create your firm's private Chambery workspace." },
      { property: "og:title", content: "Set up your firm" },
      { property: "og:description", content: "Create your firm's private workspace." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const firm = useFirm();
  const create = useServerFn(createFirm);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (firm.data) return <Navigate to="/app" />;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await create({ data: { name: String(new FormData(e.currentTarget).get("name")) } });
      await qc.invalidateQueries({ queryKey: ["my-firm"] });
      navigate({ to: "/app" });
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-8 font-brand text-ink">
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-card p-10">
        <ChamberyWordmark size="sm" />
        <img src={cat} alt="" width={816} height={816} className="mx-auto mt-6 w-28" />
        <h1 className="mt-4 font-display text-3xl">Set up your firm</h1>
        <p className="mt-2 text-sm text-sage">Create a private workspace for your EA team. You'll be its owner and can invite colleagues next. If a colleague already invited you, ask them to check the invite went to this email.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Firm name</Label><Input id="name" name="name" required minLength={2} maxLength={120} placeholder="e.g. Hartwell & Lane Consulting" /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="plum" className="w-full" disabled={busy || firm.isPending}>{busy ? "Creating…" : "Create firm workspace"}</Button>
        </form>
      </div>
    </div>
  );
}
