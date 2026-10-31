import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/calendar/status/route.ts
export const Route = createFileRoute("/api/calendar/status")({
  server: {
    handlers: {
      GET: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/calendar/status/route"); return (h.GET as (r: never) => Promise<Response>)(request as never); }),
    },
  },
});
