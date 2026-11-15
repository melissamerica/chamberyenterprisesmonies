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
      { name: "description", content: "A work-in-progress portfolio of prototypes designed to reduce or eliminate repetitive tasks across industries. Built by a seasoned executive assistant, with value across roles and lines of service." },
      { property: "og:title", content: "Chambery Reveries" },
      { property: "og:description", content: "A work-in-progress portfolio of prototypes designed to reduce or eliminate repetitive tasks across industries. Built by a seasoned executive assistant, with value across roles and lines of service." },
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
          <p>A work in progress portfolio of prototypes designed to reduce or eliminate repetitive tasks across industries.</p>
          <p>Intuitively built and designed for executive assistants, by a seasoned executive assistant—with value that extends across industries, job titles and lines of service.</p>
        </div>
      </main>
    </div>
  );
}
