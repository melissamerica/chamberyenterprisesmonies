# Roadmap — Chambery enterprise SaaS

Built (needs verification):
- [x] Firm-account/sign-in code added (email, Google, Microsoft); provider settings and cross-firm isolation are not established by this source audit
- [x] Team roles (owner / admin / editor / viewer) + invites
- [x] Chambery umbrella site: home, Anya, Alec, Security, Pricing, Contact sales (demo requests saved)
- [x] Chambery style (dark green serif, plum dot, off-white), mascots used sparingly
- [x] Workspace moves behind sign-in at /app (old /test links redirect)

Open (priority: EA workspace functions + aesthetics — Melissa, Oct 31):
- [x] Reconcile outdated/conflicting guidance; detailed source audit saved in docs/app-action-inventory.md and docs/project-history.md. Current source inspection complete; nonempty runtime upload/export and isolation verification remain unperformed. No app behavior changed.
- [x] Research private/custom AI context: primary-source findings and limits in docs/development-context-research.md; no custom service necessary merely for continuity, no perfect-memory guarantee.
- [x] Explain source-backed history, ambitions and decision checks; preserve source-linked records across sessions, not a promise of human-equivalent memory.
- [x] Save Melissa's standing rule: never grasp at straws; contributions must stem from existing code/status and settled decisions (Nov 1 02:22 UTC).
- [x] Save working roles: Melissa specifies a nuance to an existing feature; inspect and implement directly within that scope (Nov 1 02:23 UTC).
- [x] Focused read-only review of actual workspace source, v4/v5 signature blueprints and recorded decisions; source-grounded understanding saved in docs/app-understanding.md. No app behavior changed; exhaustive/runtime verification not performed.
- [x] Verify build/typecheck; fix errors (build OK)
- [x] Test workspace functions: executive creation, templates, billing codes, sample loader, legacy redirect — all pass; upload/trip flow not yet exercised with a real file
- [x] Polish /app wording: removed "Test workspace" labels and dead Reports nav entries
- [x] Redirect old /?view=... prototype links into /app

Recorded backlog — not authorized by the documentation-only review:
- Exercise document upload → trip → itinerary/expenses with a real confirmation file; requires a separately scoped state-changing validation step.
- Implement settled survey rules (docs/requirements-survey.md gap triage): durable saves, account-tied cache, report-replace warning, viewer read-only UI, full appointment fields, reservation time zones, working controls only, trip lifecycle, consistent billing validation, attributed learning, upload contract, confirmed team writes, reviewable suppressed-documents list, currency tracking, revised-booking reconciliation.
- Future proactive EA alerts in her preferred channel — including Anya voice-dialing for urgent cancellations; Alec equivalent ("the trailer"). Not authorization to enable live sends.

Deferred (per Melissa, save for later):
- Survey STOPPED: do not resume the 200-question or one-at-a-time approach. Retain settled answers; decision delegation remains conditional, not authorization for unspecified behavior.
- Signup/onboarding flow questions (invite-only vs self-serve) — leave as built
- Team & roles verification, cross-firm isolation testing
- Real pricing terms on pricing page (currently contact-based)
- Security page claim review
- Demo-request owner notification (email or in-app lead list)
- Per-client SAML IdP configuration / setup screen

## Mobile EA workspace (new Nov 1)
- Brainstorming phase — Melissa: "Don't build yet." No code changes until she approves scope.
- Note: /app redirects to sign-in without a session; workspace mobile layout not yet visually verified (only cheap read-only checks allowed meanwhile).
- [x] Resume v4: remove founder role, show AI work as project section
