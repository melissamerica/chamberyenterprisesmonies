# Roadmap — Chambery enterprise SaaS

Built (needs verification):
- [x] Firm accounts & sign-in (email, Google, Microsoft); each firm's data fully private
- [x] Team roles (owner / admin / editor / viewer) + invites
- [x] Chambery umbrella site: home, Anya, Alec, Security, Pricing, Contact sales (demo requests saved)
- [x] Chambery style (dark green serif, plum dot, off-white), mascots used sparingly
- [x] Workspace moves behind sign-in at /app (old /test links redirect)

Open (priority: EA workspace functions + aesthetics — Melissa, Oct 31):
- [ ] Learn the app as written from actual source, signature-feature blueprint and recorded decisions; save a source-grounded understanding without making Melissa reteach it. Read-only review only; no implementation authorized by this request.
- [x] Verify build/typecheck; fix errors (build OK)
- [x] Test workspace functions: executive creation, templates, billing codes, sample loader, legacy redirect — all pass; upload/trip flow not yet exercised with a real file
- [x] Polish /app wording: removed "Test workspace" labels and dead Reports nav entries
- [x] Redirect old /?view=... prototype links into /app
- [ ] Exercise the document upload → trip → itinerary/expenses flow with a real confirmation file
- [ ] Implement settled survey rules (docs/requirements-survey.md gap triage): durable saves, account-tied cache, report-replace warning, viewer read-only UI, full appointment fields, reservation time zones, working controls only, trip lifecycle, consistent billing validation, attributed learning, upload contract, confirmed team writes, reviewable suppressed-documents list, currency tracking, revised-booking reconciliation
- [ ] Future feature (Melissa, Nov 1): proactive EA alerts in her preferred channel — including Anya voice-dialing the EA for urgent items like cancellations; Alec equivalent ("the trailer")

Deferred (per Melissa, save for later):
- Survey STOPPED: do not resume the 200-question or one-at-a-time approach. Retain settled answers; decision delegation remains conditional, not authorization for unspecified behavior.
- Signup/onboarding flow questions (invite-only vs self-serve) — leave as built
- Team & roles verification, cross-firm isolation testing
- Real pricing terms on pricing page (currently contact-based)
- Security page claim review
- Demo-request owner notification (email or in-app lead list)
- Per-client SAML IdP configuration / setup screen
