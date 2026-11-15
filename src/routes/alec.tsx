import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-layout";
import dog from "@/assets/alec-dog.png";

export const Route = createFileRoute("/alec")({
  head: () => ({
    meta: [
      { title: "EA Tool for Travelers/Consultants — Chambery Reveries" },
      { name: "description", content: "Alec is a portfolio concept exploring executive support for travelers and consultants." },
      { property: "og:title", content: "EA Tool for Travelers/Consultants" },
      { property: "og:description", content: "A portfolio concept exploring executive support for travelers and consultants." },
    ],
  }),
  component: Alec,
});

function Alec() {
  return (
    <SiteShell>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2">
        <div>
          <p className="eyebrow">Portfolio concept</p>
          <h1 className="mt-6 font-display text-5xl leading-tight">EA Tool for Travelers/<wbr />Consultants <small className="project-alias">alec.</small></h1>
          <p className="mt-6 max-w-md text-sage">A concept exploring how an assistant could help travelers and consultants organize the details around their work.</p>
        </div>
        <img src={dog} alt="Alec's puppy mascot playing with a green ball" width={816} height={816} className="mx-auto w-full max-w-sm" />
      </section>
    </SiteShell>
  );
}
