import { createFileRoute, Navigate } from "@tanstack/react-router";
import { FirmBar } from "@/components/site/firm-bar";
import { useFirm } from "@/hooks/use-firm";
import { canEditWorkspace } from "@/lib/firm-roles";
import { ProjectOperations } from "@/features/project-operations/ProjectOperations";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Project Operations — Alec by Chambery" },
      { name: "description", content: "Alec project operations: synthetic, isolated demonstration workspace." },
    ],
  }),
  component: ProjectOperationsPage,
});

function ProjectOperationsPage() {
  const firm = useFirm();
  if (firm.isPending) return <div className="flex min-h-screen items-center justify-center bg-cream text-sage">Opening Project Operations…</div>;
  if (firm.isError) return <div className="flex min-h-screen items-center justify-center bg-cream text-destructive">Your firm membership could not load.</div>;
  if (!firm.data) return <Navigate to="/onboarding" />;
  return (
    <div className="min-h-screen">
      <FirmBar name={firm.data.name} role={firm.data.role} />
      <ProjectOperations key={firm.data.firmId} firmId={firm.data.firmId} canEdit={canEditWorkspace(firm.data.role)} />
    </div>
  );
}
