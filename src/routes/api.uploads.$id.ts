import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/uploads/[id]/route.ts
export const Route = createFileRoute("/api/uploads/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/uploads/[id]/route"); return h.GET(request as never, { params: Promise.resolve({ id: params.id }) } as never); }),
    },
  },
});
