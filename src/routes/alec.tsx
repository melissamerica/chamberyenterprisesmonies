import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-layout";
import { ProductWordmark } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import dog from "@/assets/alec-dog.png";

export const Route = createFileRoute("/alec")({
  head: () => ({
    meta: [
      { title: "Alec by Chambery — Make time for your dog" },
      { name: "description", content: "Alec is Chambery's upcoming assistant. Make time for your dog. Get an assistant. Join early access." },
      { property: "og:title", content: "Alec by Chambery" },
      { property: "og:description", content: "Make time for your dog. Get an assistant." },
    ],
  }),
  component: Alec,
});

function Alec() {
  return (
    <SiteShell>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2">
        <div>
          <p className="eyebrow">Early access</p>
          <ProductWordmark name="alec" tone="moss" className="mt-6 block text-8xl" />
          <p className="mt-8 text-3xl leading-snug">
            Make <span className="font-semibold text-moss">time</span> for your dog. Get an <span className="font-semibold text-moss">assistant</span>.
          </p>
          <p className="mt-6 max-w-md text-sage">Alec is the next Chambery assistant. Tell us about your team and we'll invite your firm when early access opens.</p>
          <Button asChild variant="pill" size="lg" className="mt-10"><Link to="/contact" search={{ product: "alec" }}>Join early access</Link></Button>
        </div>
        <img src={dog} alt="Alec's puppy mascot playing with a green ball" width={816} height={816} className="mx-auto w-full max-w-sm" />
      </section>
    </SiteShell>
  );
}
