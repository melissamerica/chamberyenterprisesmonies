import { createFileRoute } from "@tanstack/react-router";

// Server route ported from the original Next.js handler at app/api/uploads/unassigned/route.ts
export const Route = createFileRoute("/api/uploads/unassigned")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => { const h = await import("@/server-api/uploads/unassigned/route"); return h.PUT(request as never); },
    },
  },
});
