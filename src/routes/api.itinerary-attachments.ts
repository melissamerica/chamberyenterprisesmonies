import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/itinerary-attachments/route.ts
export const Route = createFileRoute("/api/itinerary-attachments")({
  server: {
    handlers: {
      GET: async ({ request, params }) => { const h = await import("@/server-api/itinerary-attachments/route"); return h.GET(request as never); },
      POST: async ({ request, params }) => { const h = await import("@/server-api/itinerary-attachments/route"); return h.POST(request as never); },
      PUT: async ({ request, params }) => { const h = await import("@/server-api/itinerary-attachments/route"); return h.PUT(request as never); },
    },
  },
});
