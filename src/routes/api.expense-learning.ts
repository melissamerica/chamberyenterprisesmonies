import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/expense-learning/route.ts
export const Route = createFileRoute("/api/expense-learning")({
  server: {
    handlers: {
      GET: async ({ request, params }) => { const h = await import("@/server-api/expense-learning/route"); return (h.GET as (r: never) => Promise<Response>)(request as never); },
      PATCH: async ({ request, params }) => { const h = await import("@/server-api/expense-learning/route"); return h.PATCH(request as never); },
    },
  },
});
