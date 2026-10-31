import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitDemoRequest } from "@/lib/firm.functions";
import cat from "@/assets/anya-cat.png";

export const Route = createFileRoute("/contact")({
  validateSearch: z.object({ product: z.enum(["anya", "alec"]).optional() }),
  head: () => ({
    meta: [
      { title: "Contact sales — Chambery Enterprises" },
      { name: "description", content: "Book a demo of Anya for your firm's executive assistant team, or join Alec early access." },
      { property: "og:title", content: "Talk to Chambery" },
      { property: "og:description", content: "Book a demo for your EA team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { product } = Route.useSearch();
  const send = useServerFn(submitDemoRequest);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      await send({ data: {
        name: String(f.get("name")), email: String(f.get("email")), company: String(f.get("company")),
        teamSize: String(f.get("teamSize") || "") || undefined, product: String(f.get("product") || "anya"),
        message: String(f.get("message") || "") || undefined,
      } });
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-6xl gap-16 px-6 py-24 md:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="eyebrow">Contact sales</p>
          <h1 className="mt-4 font-display text-5xl leading-tight">Let's give your EA team a chief of staff.</h1>
          <p className="mt-6 text-sage">Tell us about your firm. We'll set up a walkthrough, a pilot workspace and answer your security questions.</p>
          <img src={cat} alt="" width={816} height={816} loading="lazy" className="mt-10 hidden w-44 md:block" />
        </div>
        {state === "sent" ? (
          <div className="rounded-3xl border border-hairline bg-card p-10">
            <h2 className="font-display text-3xl">Thank you<span className="brand-dot" /></h2>
            <p className="mt-4 text-sage">We've received your request and will be in touch within one business day.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-hairline bg-card p-10">
            <Field label="Full name" name="name" required />
            <Field label="Work email" name="email" type="email" required />
            <Field label="Firm" name="company" required />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teamSize">EA team size</Label>
                <select id="teamSize" name="teamSize" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select</option><option>1–10</option><option>11–50</option><option>51–200</option><option>200+</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Interested in</Label>
                <select id="product" name="product" defaultValue={product ?? "anya"} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="anya">Anya</option><option value="alec">Alec (early access)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Anything we should know?</Label>
              <Textarea id="message" name="message" maxLength={2000} rows={4} />
            </div>
            {state === "error" && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="plum" size="lg" disabled={state === "sending"} className="w-full">
              {state === "sending" ? "Sending…" : "Book a demo"}
            </Button>
          </form>
        )}
      </section>
    </SiteShell>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} maxLength={255} />
    </div>
  );
}
