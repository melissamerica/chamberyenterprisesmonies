import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/billing-codes/assignments/route.ts
export const Route = createFileRoute("/api/billing-codes/assignments")({
  server: {
    handlers: {
      POST: async ({ request, params }) => { const h = await import("@/server-api/billing-codes/assignments/route"); return h.POST(request as never); },
    },
  },
});
