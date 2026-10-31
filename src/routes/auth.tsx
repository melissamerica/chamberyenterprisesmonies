import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChamberyWordmark } from "@/components/site/brand";

const safePath = (p?: string) => {
  if (!p) return "/app";
  try { const u = new URL(p, "http://x"); return u.origin === "http://x" ? u.pathname + u.search : "/app"; } catch { return "/app"; }
};

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Chambery Enterprises" },
      { name: "description", content: "Sign in to your firm's Chambery workspace with Microsoft, Google, company single sign-on or email." },
      { property: "og:title", content: "Sign in to Chambery" },
      { property: "og:description", content: "Access your firm's Anya workspace." },
    ],
  }),
  component: AuthPage,
});

const PENDING_KEY = "chambery-auth-next";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const next = safePath(redirect);
  const [mode, setMode] = useState<"signin" | "signup" | "sso">("signin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    const go = () => {
      const stored = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      navigate({ href: safePath(stored ?? next), replace: true });
    };
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) go(); });
    return () => data.subscription.unsubscribe();
  }, [navigate, next]);

  async function social(provider: "google" | "microsoft") {
    setMsg(null);
    sessionStorage.setItem(PENDING_KEY, next);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) setMsg({ tone: "error", text: result.error.message ?? "Sign-in failed. Try again." });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    setBusy(true); setMsg(null);
    try {
      if (mode === "sso") {
        const domain = email.includes("@") ? email.split("@")[1]! : email;
        sessionStorage.setItem(PENDING_KEY, next);
        const { data, error } = await supabase.auth.signInWithSSO({ domain, options: { redirectTo: `${window.location.origin}/auth` } });
        if (error) throw new Error("Single sign-on isn't set up for this domain yet. Ask your firm admin, or use another sign-in option.");
        if (data?.url) window.location.href = data.url;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: String(f.get("password")), options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
        setMsg({ tone: "info", text: "Check your email to confirm your account, then sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: String(f.get("password")) });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen bg-cream font-brand text-ink">
      <div className="hidden flex-1 flex-col justify-between bg-primary p-14 text-primary-foreground lg:flex">
        <Link to="/"><ChamberyWordmark size="md" className="[&_*]:text-primary-foreground" /></Link>
        <p className="max-w-md font-display text-4xl leading-tight">Eliminate the human error, <span className="text-plum">not the human.</span></p>
        <p className="text-sm text-primary-foreground/60">Private, firm-isolated workspaces for executive assistant teams.</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Link to="/"><ChamberyWordmark size="sm" /></Link></div>
          <h1 className="mt-8 font-display text-3xl">{mode === "signup" ? "Create your account" : mode === "sso" ? "Company single sign-on" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-sage">{mode === "sso" ? "Enter your work email and we'll send you to your firm's sign-in." : "Sign in to your firm's workspace."}</p>

          {mode !== "sso" && (
            <div className="mt-8 space-y-3">
              <Button type="button" variant="hairline" className="w-full" onClick={() => social("microsoft")}>Continue with Microsoft</Button>
              <Button type="button" variant="hairline" className="w-full" onClick={() => social("google")}>Continue with Google</Button>
              <Button type="button" variant="hairline" className="w-full" onClick={() => { setMode("sso"); setMsg(null); }}>Continue with company SSO</Button>
              <div className="flex items-center gap-3 py-2 text-xs text-sage"><span className="h-px flex-1 bg-hairline" />or with email<span className="h-px flex-1 bg-hairline" /></div>
            </div>
          )}

          <form onSubmit={onSubmit} className={mode === "sso" ? "mt-8 space-y-4" : "space-y-4"}>
            <div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
            {mode !== "sso" && (
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></div>
            )}
            {msg && <p className={msg.tone === "error" ? "text-sm text-destructive" : "text-sm text-plum-deep"}>{msg.text}</p>}
            <Button type="submit" variant="pill" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "sso" ? "Continue" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-sage">
            {mode === "signin" && <>New to Chambery? <button className="text-plum hover:underline" onClick={() => { setMode("signup"); setMsg(null); }}>Create an account</button></>}
            {mode === "signup" && <>Already have an account? <button className="text-plum hover:underline" onClick={() => { setMode("signin"); setMsg(null); }}>Sign in</button></>}
            {mode === "sso" && <button className="text-plum hover:underline" onClick={() => { setMode("signin"); setMsg(null); }}>Back to other sign-in options</button>}
          </p>
        </div>
      </div>
    </div>
  );
}
