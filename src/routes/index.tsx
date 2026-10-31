import { createFileRoute } from "@tanstack/react-router";
import Home from "@/anya/page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anya | The EA’s Assistant" },
      { name: "description", content: "Every trip, thoughtfully organized. Itineraries, calendars and expenses in one place." },
      { property: "og:title", content: "Anya | The EA’s Assistant" },
      { property: "og:description", content: "Every trip, thoughtfully organized. Itineraries, calendars and expenses in one place." },
    ],
  }),
  component: Home,
});
