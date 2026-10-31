import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/billing-codes/import/route.ts
export const Route = createFileRoute("/api/billing-codes/import")({
  server: {
    handlers: {
      POST: async ({ request, params }) => { const h = await import("@/server-api/billing-codes/import/route"); return (h.POST as (r: never) => Promise<Response>)(request as never); },
    },
  },
});
