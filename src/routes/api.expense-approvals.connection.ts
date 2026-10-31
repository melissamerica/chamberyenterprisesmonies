import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/expense-approvals/connection/route.ts
export const Route = createFileRoute("/api/expense-approvals/connection")({
  server: {
    handlers: {
      POST: async ({ request, params }) => { const h = await import("@/server-api/expense-approvals/connection/route"); return (h.POST as (r: never) => Promise<Response>)(request as never); },
    },
  },
});
