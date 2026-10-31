import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/billing-codes/route.ts
export const Route = createFileRoute("/api/billing-codes")({
  server: {
    handlers: {
      GET: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/billing-codes/route"); return (h.GET as (r: never) => Promise<Response>)(request as never); }),
      PUT: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/billing-codes/route"); return h.PUT(request as never); }),
    },
  },
});
