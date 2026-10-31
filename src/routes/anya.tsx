import { createFileRoute } from "@tanstack/react-router";
import { ProductHome } from "@/components/product-home";
import { SiteHeader } from "@/components/site/site-layout";

export const Route = createFileRoute("/anya")({
  head: () => ({
    meta: [
      { title: "Anya by Chambery — Every trip, thoughtfully organized" },
      { name: "description", content: "Anya turns travel confirmations, receipts and statements into calendars, itineraries and expense reports for executive assistants." },
      { property: "og:title", content: "Anya by Chambery" },
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
