import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/executive-profiles/route.ts
export const Route = createFileRoute("/api/executive-profiles")({
  server: {
    handlers: {
      GET: async ({ request, params }) => { const h = await import("@/server-api/executive-profiles/route"); return h.GET(request as never); },
      PUT: async ({ request, params }) => { const h = await import("@/server-api/executive-profiles/route"); return h.PUT(request as never); },
    },
  },
});
