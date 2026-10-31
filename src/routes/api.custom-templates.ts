import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/custom-templates/route.ts
export const Route = createFileRoute("/api/custom-templates")({
  server: {
    handlers: {
      GET: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/custom-templates/route"); return (h.GET as (r: never) => Promise<Response>)(request as never); }),
      PUT: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/custom-templates/route"); return h.PUT(request as never); }),
      POST: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/custom-templates/route"); return (h.POST as (r: never) => Promise<Response>)(request as never); }),
    },
  },
});
