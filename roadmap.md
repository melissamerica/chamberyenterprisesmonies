# Roadmap — Chambery enterprise SaaS

Built (needs verification):
- [x] Firm accounts & sign-in (email, Google, Microsoft); each firm's data fully private
- [x] Team roles (owner / admin / editor / viewer) + invites
- [x] Chambery umbrella site: home, Anya, Alec, Security, Pricing, Contact sales (demo requests saved)
- [x] Chambery style (dark green serif, plum dot, off-white), mascots used sparingly
- [x] Workspace moves behind sign-in at /app (old /test links redirect)

Open (priority: EA workspace functions + aesthetics — Melissa, Oct 31):
- [ ] Requirements survey: 200 questions in 20-question checkpoints focused on features, functions, rules and roles; confirmed answers become the build spec and are implemented in checkpoint-sized steps. Await Melissa's answers between checkpoints.
- [x] Verify build/typecheck; fix errors (build OK)
- [x] Test workspace functions: executive creation, templates, billing codes, sample loader, legacy redirect — all pass; upload/trip flow not yet exercised with a real file
- [x] Polish /app wording: removed "Test workspace" labels and dead Reports nav entries
- [x] Redirect old /?view=... prototype links into /app
- [ ] Exercise the document upload → trip → itinerary/expenses flow with a real confirmation file

Deferred (per Melissa, save for later):
- Signup/onboarding flow questions (invite-only vs self-serve) — leave as built
- Team & roles verification, cross-firm isolation testing
- Real pricing terms on pricing page (currently contact-based)
- Security page claim review
- Demo-request owner notification (email or in-app lead list)
- Per-client SAML IdP configuration / setup screen
