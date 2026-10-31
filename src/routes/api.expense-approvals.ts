import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/expense-approvals/route.ts
export const Route = createFileRoute("/api/expense-approvals")({
  server: {
    handlers: {
      GET: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/expense-approvals/route"); return (h.GET as (r: never) => Promise<Response>)(request as never); }),
      POST: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/expense-approvals/route"); return (h.POST as (r: never) => Promise<Response>)(request as never); }),
      PATCH: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/expense-approvals/route"); return h.PATCH(request as never); }),
    },
  },
});
