import { createFileRoute } from "@tanstack/react-router";
import { ExecHome } from "@/features/exec-mobile/ExecHome";
export const Route = createFileRoute("/exec")({
  head: () => ({
    meta: [
      { title: "ExecOS Executive Mobile" },
      { name: "description", content: "A minimalist mobile home screen for executives: answer, ask, upload, and see the next 48 hours." },
      { property: "og:title", content: "ExecOS Executive Mobile" },
      { property: "og:description", content: "Answer, ask, upload — and the next 48 hours at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExecHome,
});

