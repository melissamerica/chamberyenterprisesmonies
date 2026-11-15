import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Cat, Dog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChamberyWordmark } from "@/components/site/brand";

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
      { title: "Chambery Reveries — Projects" },
      { name: "description", content: "A portfolio in progress, drawing on more than 10 years of executive assistant experience to reduce repetitive work and explore concepts in business development and project management." },
      { property: "og:title", content: "Chambery Reveries" },
      { property: "og:description", content: "A portfolio in progress, drawing on more than 10 years of executive assistant experience to reduce repetitive work and explore concepts in business development and project management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChamberyHome,
});

function ChamberyHome() {
  return (
    <div className="min-h-screen bg-cream font-brand text-ink">
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <h1 aria-label="Chambery Reveries">
          <ChamberyWordmark subSizeIncrease={3} className="[&>span:first-child]:text-5xl [&>span:first-child]:tracking-normal [&>span:last-child]:tracking-normal md:[&>span:first-child]:text-7xl" />
        </h1>
        <div className="portfolio-intro-projects">
        <div className="portfolio-intro space-y-4 text-lg leading-relaxed text-sage">
          <p>A portfolio in progress, drawing on more than 10 years of executive assistant experience to develop inventive solutions that reduce or eliminate repetitive work, alongside concepts focused on business development and project management.</p>
          <p>These prototypes bring firsthand insight, sharp intuition and original thinking to the demands of executive support. Built by an executive assistant, for executive assistants, they put the person doing the work first—with value that extends across industries, roles and lines of service.</p>
        </div>
        <nav aria-label="Portfolio projects" className="portfolio-projects flex flex-col items-start gap-5">
          <Button asChild variant="link" className="relative h-auto max-w-full justify-start rounded-none p-0 pb-3 font-display text-xl text-ink underline decoration-hairline underline-offset-4 whitespace-normal hover:decoration-ink">
            <Link to="/anya" aria-label="Open Executive Assistant EA project" data-project="anya">
              <span className="leading-snug">Executive Assistant EA</span>
              <span className="absolute bottom-0 right-0 flex origin-bottom-right scale-[0.333333] items-center gap-1.5">
                <Cat aria-hidden="true" className="size-4" strokeWidth={1.4} />
                <span className="font-display text-xs">anya.</span>
              </span>
            </Link>
          </Button>
          <Button asChild variant="link" className="relative h-auto max-w-full justify-start rounded-none p-0 pb-3 font-display text-xl text-ink underline decoration-hairline underline-offset-4 whitespace-normal hover:decoration-ink">
            <Link to="/alec" aria-label="Open Traveler/Consultant EA project" data-project="alec">
              <span className="leading-snug">Traveler/<wbr />Consultant EA</span>
              <span className="absolute bottom-0 right-0 flex origin-bottom-right scale-[0.333333] items-center gap-1.5">
                <Dog aria-hidden="true" className="size-4" strokeWidth={1.4} />
                <span className="font-display text-xs">alec.</span>
              </span>
            </Link>
          </Button>
          <span data-project="ask-answer" className="font-display text-xl leading-snug text-sage">Ask.Answer</span>
          <span data-project="bd-ops" className="font-display text-xl leading-snug text-sage">BD Ops <span className="text-sm">based on travel</span></span>
        </nav>
        </div>
      </main>
    </div>
  );
}
