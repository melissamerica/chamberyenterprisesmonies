import { createFileRoute } from "@tanstack/react-router";
import { withApprovalToken } from "@/server/tenant";

// Server route ported from the original Next.js handler at app/api/expense-approvals/review/[...path]/route.ts
export const Route = createFileRoute("/api/expense-approvals/review/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => withApprovalToken(request, (params._splat ?? "").split("/")[0] ?? "", async () => { const h = await import("@/server-api/expense-approvals/review/[...path]/route"); return h.GET(request as never, { params: Promise.resolve({ path: (params._splat ?? "").split("/").filter(Boolean) }) } as never); }),
      POST: async ({ request, params }) => withApprovalToken(request, (params._splat ?? "").split("/")[0] ?? "", async () => { const h = await import("@/server-api/expense-approvals/review/[...path]/route"); return h.POST(request as never, { params: Promise.resolve({ path: (params._splat ?? "").split("/").filter(Boolean) }) } as never); }),
    },
  },
});
