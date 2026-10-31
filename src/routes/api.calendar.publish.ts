import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/calendar/publish/route.ts
export const Route = createFileRoute("/api/calendar/publish")({
  server: {
    handlers: {
      POST: async ({ request, params }) => { const h = await import("@/server-api/calendar/publish/route"); return h.POST(request as never); },
    },
  },
});
