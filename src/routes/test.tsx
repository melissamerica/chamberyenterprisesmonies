import { createFileRoute } from "@tanstack/react-router";
import { TestWorkspace } from "@/anya/page";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Test workspace | Anya" },
      { name: "description", content: "Anya's working travel workspace for executives, trips, templates and expenses." },
      { property: "og:title", content: "Test workspace | Anya" },
      { property: "og:description", content: "Anya's working travel workspace for executives, trips, templates and expenses." },
    ],
  }),
  component: TestWorkspace,
});
