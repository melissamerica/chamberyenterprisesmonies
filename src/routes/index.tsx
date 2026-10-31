import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ShieldCheck, Users, KeyRound, Building2 } from "lucide-react";
import { SiteShell } from "@/components/site/site-layout";
import { ChamberyWordmark, ProductWordmark } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import cat from "@/assets/anya-cat.png";
import dog from "@/assets/alec-dog.png";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => search,
  // Legacy prototype links (/?view=...) open the signed-in firm workspace.
  beforeLoad: ({ search }) => {
    if (typeof search.view === "string" && search.view) {
      throw redirect({ to: "/app", search: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Chambery Enterprises — Assistants for executive assistants" },
      { name: "description", content: "Chambery builds Anya and Alec, enterprise-ready assistants for executive assistants at consulting firms. Eliminate the human error, not the human." },
      { property: "og:title", content: "Chambery Enterprises" },
      { property: "og:description", content: "Eliminate the human error, not the human. Anya and Alec for executive assistant teams." },
    ],
  }),
  component: ChamberyHome,
});

const pillars = [
  { icon: Building2, title: "Private firm workspaces", body: "Every firm's executives, trips, receipts and reports are kept in its own isolated workspace." },
  { icon: Users, title: "Roles for real teams", body: "Owners, admins, editors and viewers — so assistants, managers and finance each see what they should." },
  { icon: KeyRound, title: "Company single sign-on", body: "Sign in with your corporate identity provider, or with Microsoft, Google or email." },
  { icon: ShieldCheck, title: "Humans stay in control", body: "Nothing is filed, sent or published without an explicit review step." },
];

function ChamberyHome() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28">
        <p className="eyebrow">For executive assistant teams at consulting firms</p>
        <div className="mt-8"><ChamberyWordmark size="xl" /></div>
        <p className="mt-10 max-w-2xl text-2xl leading-snug md:text-3xl">
          Eliminate the human error, <span className="font-semibold text-plum">not the human.</span>
        </p>
        <p className="mt-6 max-w-xl text-lg text-sage">
          Assistants that take the detail work off your EA team — itineraries, calendars, expenses and approvals — while every decision stays with your people.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="plum" size="lg"><Link to="/contact">Book a demo</Link></Button>
          <Button asChild variant="hairline" size="lg"><Link to="/anya">Meet Anya</Link></Button>
        </div>
      </section>

      <section className="border-y border-hairline bg-card/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">Products</p>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <ProductCard to="/anya" name="anya" tone="plum" img={cat} alt="Anya's cat mascot in a navy vest"
              line={<>An EA with an EA is a <span className="font-semibold text-plum">chief of staff</span>.</>}
              body="Turns travel confirmations, receipts and statements into calendars, itineraries and approved expense reports." badge="Available now" />
            <ProductCard to="/alec" name="alec" tone="moss" img={dog} alt="Alec's puppy mascot with a green ball"
              line={<>Make <span className="font-semibold text-moss">time</span> for your dog. Get an <span className="font-semibold text-moss">assistant</span>.</>}
              body="A companion assistant for the people your EAs support. Join the early access list." badge="Early access" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">Built for the enterprise</p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight">Ready for the security review, from day one.</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="bg-cream p-7">
              <p.icon className="size-5 text-plum" />
              <h3 className="mt-5 font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sage">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10"><Button asChild variant="link" className="px-0 text-plum"><Link to="/security">Read about security →</Link></Button></div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary px-10 py-12 text-primary-foreground md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl">Bring Chambery to your firm.</h2>
            <p className="mt-2 text-primary-foreground/70">Firm-wide rollout, single sign-on and onboarding for your EA team.</p>
          </div>
          <Button asChild variant="plum" size="lg"><Link to="/contact">Talk to sales</Link></Button>
        </div>
      </section>
    </SiteShell>
  );
}

function ProductCard(props: { to: "/anya" | "/alec"; name: "anya" | "alec"; tone: "plum" | "moss"; img: string; alt: string; line: React.ReactNode; body: string; badge: string }) {
  return (
    <Link to={props.to} className="group flex flex-col rounded-3xl border border-hairline bg-cream p-10 transition-shadow hover:shadow-soft">
      <div className="flex items-start justify-between">
        <ProductWordmark name={props.name} tone={props.tone} className="text-6xl" />
        <span className="rounded-full border border-hairline px-3 py-1 text-xs text-sage">{props.badge}</span>
      </div>
      <img src={props.img} alt={props.alt} width={816} height={816} loading="lazy" className="my-6 h-40 w-40 self-center object-contain transition-transform group-hover:-translate-y-1" />
      <p className="text-xl">{props.line}</p>
      <p className="mt-3 text-sm leading-relaxed text-sage">{props.body}</p>
    </Link>
  );
}
