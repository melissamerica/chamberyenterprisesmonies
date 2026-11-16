import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve previously shared links without exposing the application workspace.
export const Route = createFileRoute("/contact")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});
