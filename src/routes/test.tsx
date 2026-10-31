import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy prototype links (/test?view=...) now open the signed-in firm workspace.
export const Route = createFileRoute("/test")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/app${location.searchStr ?? ""}` });
  },
});
