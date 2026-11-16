import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve previously shared links without exposing the application workspace.
export const Route = createFileRoute("/exec")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});
