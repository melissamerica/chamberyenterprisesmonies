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
      { title: "Chambery Enterprises — Projects" },
      { name: "description", content: "Chambery Enterprises. Explore Anya, Alec and the existing Chambery workspace." },
      { property: "og:title", content: "Chambery Enterprises" },
      { property: "og:description", content: "Chambery Enterprises. Anya, Alec and the Chambery workspace." },
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
        <h1 aria-label="Chambery Enterprises">
          <ChamberyWordmark className="[&>span:first-child]:text-5xl [&>span:first-child]:tracking-normal [&>span:last-child]:tracking-normal md:[&>span:first-child]:text-7xl" />
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-sage">
          Automate the things you hate
        </p>
      </main>
    </div>
  );
}
