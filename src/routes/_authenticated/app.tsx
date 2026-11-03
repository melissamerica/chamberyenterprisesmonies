import { createFileRoute, Navigate } from "@tanstack/react-router";
import { TestWorkspace } from "@/anya/page";
import { FirmBar } from "@/components/site/firm-bar";
import { useFirm } from "@/hooks/use-firm";
import { installFirmFetch } from "@/lib/firm-fetch";

installFirmFetch();

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Workspace — Anya by Chambery" },
      { name: "description", content: "Your firm's Anya workspace for executives, trips, templates and expenses." },
      { property: "og:title", content: "Anya workspace" },
      { property: "og:description", content: "Your firm's Anya workspace." },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const firm = useFirm();
  if (firm.isPending) return <div className="flex min-h-screen items-center justify-center bg-cream text-sage">Opening your workspace…</div>;
  if (firm.isError) return <div className="flex min-h-screen items-center justify-center bg-cream text-destructive">Your workspace could not load. Refresh to try again.</div>;
  if (!firm.data) return <Navigate to="/onboarding" />;
  return (
    <div className="min-h-screen">
      <FirmBar name={firm.data.name} role={firm.data.role} />
      <TestWorkspace key={`${firm.data.userId}:${firm.data.firmId}`} cacheScope={{ userId: firm.data.userId, firmId: firm.data.firmId, role: firm.data.role }} />
    </div>
  );
}
