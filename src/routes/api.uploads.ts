import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/uploads/route.ts
export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      GET: async ({ request, params }) => { const h = await import("@/server-api/uploads/route"); return (h.GET as (r: never) => Promise<Response>)(request as never); },
      POST: async ({ request, params }) => { const h = await import("@/server-api/uploads/route"); return (h.POST as (r: never) => Promise<Response>)(request as never); },
      PUT: async ({ request, params }) => { const h = await import("@/server-api/uploads/route"); return h.PUT(request as never); },
    },
  },
});
