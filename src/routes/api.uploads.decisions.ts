import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/uploads/decisions/route.ts
export const Route = createFileRoute("/api/uploads/decisions")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/uploads/decisions/route"); return h.PUT(request as never); }),
      DELETE: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/uploads/decisions/route"); return h.DELETE(request as never); }),
    },
  },
});
