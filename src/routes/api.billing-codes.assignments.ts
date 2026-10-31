import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/billing-codes/assignments/route.ts
export const Route = createFileRoute("/api/billing-codes/assignments")({
  server: {
    handlers: {
      POST: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/billing-codes/assignments/route"); return (h.POST as (r: never) => Promise<Response>)(request as never); }),
    },
  },
});
