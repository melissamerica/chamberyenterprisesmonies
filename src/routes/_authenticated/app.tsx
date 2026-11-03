import { createFileRoute, Navigate } from "@tanstack/react-router";
import { TestWorkspace } from "@/anya/page";
import { FirmBar } from "@/components/site/firm-bar";
import { useFirm } from "@/hooks/use-firm";
import { useSession } from "@/hooks/use-session";
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
  const { session, ready } = useSession();
  if (firm.isPending || !ready) return <div className="flex min-h-screen items-center justify-center bg-cream text-sage">Opening your workspace…</div>;
  if (firm.isError) return <div className="flex min-h-screen items-center justify-center bg-cream text-destructive">Your workspace could not load. Refresh to try again.</div>;
  if (!session) return <Navigate to="/auth" search={{ redirect: "/app" }} />;
  if (!firm.data) return <Navigate to="/onboarding" />;
  return (
    <div className="min-h-screen">
      <FirmBar name={firm.data.name} role={firm.data.role} />
      <TestWorkspace key={`${firm.data.firmId}:${session.user.id}`} firmId={firm.data.firmId} userId={session.user.id} readOnly={firm.data.role === "viewer"} />
    </div>
  );
}
