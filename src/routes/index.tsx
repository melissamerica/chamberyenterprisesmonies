import { createFileRoute, redirect } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-layout";
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
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <h1 aria-label="Chambery Reveries">
          <ChamberyWordmark className="[&>span:first-child]:text-5xl [&>span:first-child]:tracking-normal [&>span:last-child]:tracking-normal md:[&>span:first-child]:text-7xl" />
        </h1>
        <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-sage">
          <p>A portfolio in progress, drawing on more than 10 years of executive assistant experience to develop inventive solutions that reduce or eliminate repetitive work, alongside concepts focused on business development and project management.</p>
          <p>These prototypes bring firsthand insight, sharp intuition and original thinking to the demands of executive support. Built by an executive assistant, for executive assistants, they put the person doing the work first—with value that extends across industries, roles and lines of service.</p>
        </div>
      </main>
    </div>
  );
}
