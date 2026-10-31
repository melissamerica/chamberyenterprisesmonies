import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/expense-approvals/route.ts
export const Route = createFileRoute("/api/expense-approvals")({
  server: {
    handlers: {
      GET: async ({ request, params }) => { const h = await import("@/server-api/expense-approvals/route"); return h.GET(request as never); },
      POST: async ({ request, params }) => { const h = await import("@/server-api/expense-approvals/route"); return h.POST(request as never); },
      PATCH: async ({ request, params }) => { const h = await import("@/server-api/expense-approvals/route"); return h.PATCH(request as never); },
    },
  },
});
