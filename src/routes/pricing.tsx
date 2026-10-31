import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteShell } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Chambery Enterprises" },
      { name: "description", content: "Plans for EA teams and firm-wide rollouts of Anya, with single sign-on and onboarding for enterprises." },
      { property: "og:title", content: "Chambery pricing" },
      { property: "og:description", content: "Team and Enterprise plans for executive assistant teams." },
    ],
  }),
  component: Pricing,
});

const plans = [
  { name: "Team", price: "Talk to us", sub: "For a single EA team or practice group", features: ["Private firm workspace", "Owner, admin, editor and viewer roles", "Microsoft, Google and email sign-in", "Templates and expense approvals"], cta: "Start a pilot", featured: false },
  { name: "Enterprise", price: "Custom", sub: "For firm-wide rollouts", features: ["Everything in Team", "SAML single sign-on", "Security review and data processing terms", "Guided onboarding for your EA team", "Priority support"], cta: "Contact sales", featured: true },
];

function Pricing() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-6 py-24">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-4 font-display text-5xl">Plans that grow with your firm.</h1>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div key={p.name} className={cn("flex flex-col rounded-3xl border p-10", p.featured ? "border-primary bg-primary text-primary-foreground" : "border-hairline bg-cream")}>
              <p className={cn("eyebrow", p.featured && "text-primary-foreground/70")}>{p.name}</p>
              <p className="mt-4 font-display text-4xl">{p.price}</p>
              <p className={cn("mt-2 text-sm", p.featured ? "text-primary-foreground/70" : "text-sage")}>{p.sub}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-3"><Check className="size-4 shrink-0 text-plum" />{f}</li>)}
              </ul>
              <Button asChild variant={p.featured ? "plum" : "pill"} size="lg" className="mt-10"><Link to="/contact">{p.cta}</Link></Button>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
