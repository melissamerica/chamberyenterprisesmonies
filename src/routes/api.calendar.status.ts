import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/calendar/status/route.ts
export const Route = createFileRoute("/api/calendar/status")({
  server: {
    handlers: {
      GET: async ({ request, params }) => { const h = await import("@/server-api/calendar/status/route"); return h.GET(request as never); },
    },
  },
});
