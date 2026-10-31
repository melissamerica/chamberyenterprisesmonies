import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Chambery Enterprises" },
      { name: "description", content: "How Chambery keeps each firm's data private: isolated firm workspaces, role-based access, single sign-on, and human review before anything is sent." },
      { property: "og:title", content: "Security at Chambery" },
      { property: "og:description", content: "Isolated firm workspaces, role-based access and single sign-on." },
    ],
  }),
  component: Security,
});

const sections = [
  ["Firm isolation", "Each firm's executives, trips, documents, templates and reports live in a separate workspace. Every request is checked against the signed-in person's firm before any data is read or written, and uploaded files are stored privately per firm."],
  ["Access control", "Four roles — Owner, Admin, Editor and Viewer. Viewers are read-only; only Owners and Admins can invite or remove people; only Owners can grant admin access or change single sign-on."],
  ["Sign-in", "Microsoft, Google or email with confirmation, plus SAML single sign-on with your corporate identity provider (Okta, Microsoft Entra ID and others) for firms on an enterprise plan."],
  ["Human review", "Anya never files a document, sends an email or publishes a calendar change without an explicit confirmation. Live calendar and email delivery is switched off until your firm enables it."],
  ["Expense approvals", "Approvers review through a private, single-purpose link. Reports and supporting documents are snapshotted at send time so the approved version can't change afterwards."],
  ["Data handling", "Data is encrypted in transit and at rest. We don't use your firm's records to train AI models. Contact us for our security questionnaire and data processing terms."],
];

function Security() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-6 py-24">
        <p className="eyebrow">Security</p>
        <h1 className="mt-4 font-display text-5xl leading-tight">Your firm's data stays your firm's.</h1>
        <div className="mt-16 divide-y divide-hairline border-y border-hairline">
          {sections.map(([title, body]) => (
            <div key={title} className="grid gap-4 py-8 md:grid-cols-[220px_1fr]">
              <h2 className="font-semibold">{title}</h2>
              <p className="leading-relaxed text-sage">{body}</p>
            </div>
          ))}
        </div>
        <Button asChild variant="pill" size="lg" className="mt-12"><Link to="/contact">Request our security pack</Link></Button>
      </section>
    </SiteShell>
  );
}
