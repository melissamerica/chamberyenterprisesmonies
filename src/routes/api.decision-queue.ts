import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/server/tenant";

export const Route = createFileRoute("/api/decision-queue")({
  server: {
    handlers: {
      GET: async ({ request }) => withTenant(request, async () => (await import("@/server-api/decision-queue/route")).GET(request)),
      POST: async ({ request }) => withTenant(request, async () => (await import("@/server-api/decision-queue/route")).POST(request)),
    },
  },
});
