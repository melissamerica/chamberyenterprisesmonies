import { createFileRoute } from "@tanstack/react-router";
import { ProductHome } from "@/components/product-home";
import { SiteHeader } from "@/components/site/site-layout";

export const Route = createFileRoute("/anya")({
  head: () => ({
    meta: [
      { title: "EA Tool for Executive Assistants — Chambery Reveries" },
      { name: "description", content: "Anya turns travel confirmations, receipts and statements into calendars, itineraries and expense reports for executive assistants." },
      { property: "og:title", content: "EA Tool for Executive Assistants" },
      { property: "og:description", content: "Every trip, thoughtfully organized. An EA with an EA is a chief of staff." },
    ],
  }),
  component: () => (
    <div className="bg-cream">
      <SiteHeader />
      <ProductHome />
    </div>
  ),
});
