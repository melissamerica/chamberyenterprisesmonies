import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/calendar/publish/route.ts
export const Route = createFileRoute("/api/calendar/publish")({
  server: {
    handlers: {
      POST: async ({ request, params }) => withTenant(request, async () => { const h = await import("@/server-api/calendar/publish/route"); return (h.POST as (r: never) => Promise<Response>)(request as never); }),
    },
  },
});
