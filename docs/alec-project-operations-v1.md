# Alec Project Operations V1 — isolated demonstration build

**Status:** feature branch only; synthetic-data demonstration. No deployment, merge, production migration, external provider authentication, booking, payment, timesheet posting, client email, or invoice issuance is included.

## Scope delivered in this branch

- An authenticated, existing-firm-gated `/projects` route alongside the existing `/app`; `FirmBar` links both. Existing Anya pages and the separate mobile-demo branch are unchanged.
- Portfolio overview with budget, actual costs, open commitments, forecast overruns, project drill-down, client projects, staffing assignments, milestones, margin-on-recorded-actuals, and attention items.
- Synthetic Jira/Microsoft Project assignments with explicit PM-provided on-site/hybrid/remote designations. No inference that an ordinary Jira issue implies travel.
- Strict synthetic text travel-confirmation intake (labeled .txt/.csv only) and project-code matching; idempotency guard by project/reservation reference; staged commitments, manual actual reconciliation, and travel-cost forecast effects. **Does not yet connect directly to the existing Anya PDF/receipt import pipeline.**
- Synthetic Outlook calendar items with selectable billable hours, manual hour corrections, explicit employee review, and billing-draft inclusion only after review.
- Firm-controlled PM approval demonstration; one PM can approve/decline simulated vendor/expense requests; no automated escalation or real payment.
- Vendor commitments, project finance forecast, risk flags, printable/downloadable text status report, and client invoice preparation using reviewed time and reconciled eligible costs. Invoices are only fictional drafts; client contract terms remain manually configured, as chosen.
- Connector *interfaces only* for Jira/Microsoft Project, Outlook, ERP/PSA, and corporate travel platforms. Every live integration is disabled.

## Trusted boundaries

The route enforces sign-in through `/_authenticated` and requires existing firm membership via `useFirm`. The module receives the current firm identifier and denies mutation buttons to the generic `viewer` role.

**This is not yet durable multi-tenant project storage:** demo records are independently initialized in memory for the signed-in firm session and reset on refresh. No real production client, employee, financial, or travel data are queried, stored, or modified. It is therefore not a substitute for firm-isolated server APIs and database row-level security. Those require a later, separately approved integration/migration stage.

**Financial semantics:** all amounts are integer cents. An unreconciled booking is an open commitment; a reconciled booking is an actual charge and no longer counts as open, preventing double counting. Pending vendor invoices are committed; approved demo vendor invoices appear as incurred costs, not as released payments. Forecast = actual + open commitments + preconfigured remaining labor forecast. Gross margin shown uses recorded recognized revenue less recorded actual costs; it is not an audited P&L.

**Scope of import:** V1's sample importer accepts human-readable labeled lines of `Project`, `Reservation`, `Description`, `Category`, `Amount`, and `Date`. It does not recognize arbitrary PDF confirmations, credit-card statements, receipts, or Outlook ICS feeds. Those remain separate existing or future integrations.

## Manual acceptance checklist

1. Sign in as a firm member. Navigate to **Project Operations** using the shared firm bar; unauthenticated access must redirect to sign-in.
2. Observe three fictional engagements. The Denver demo forecast should exceed its cost budget; Boston should not.
3. Open Denver; verify forecast headroom and assignment attendance designations.
4. Open Travel & costs. Select the included `flight-confirmation-demo.txt` booking and reconcile its $650 reservation to $680; actual costs should increase $680, commitments decrease $650, forecast increase $30.
5. Paste a labeled confirmation for a new reservation. Press **Record commitment**. Repeat without changing the reservation; the second import must be rejected as duplicate.
6. Open Time review for Denver; change the workshop from 2.5 to 2.25 hours and uncheck the lunch; press **Confirm time review**.
7. Open Reporting; verify only employee-reviewed selected time appears in the draft client billing calculation. No outbound send exists.
8. Open PM approvals for Denver; approve the sample vendor invoice; $12,000 moves from outstanding commitments to recorded incurred cost, with no simulated payment release.
9. Download the status report; verify it explicitly says **SYNTHETIC DEMONSTRATION**.
10. Change to viewer role in a controlled staging tenant; demo write controls should be disabled.
11. Refresh; demo edits should reset, with a visible explanation that this is session-only.
12. Confirm no changes to the Anya /app flows, mobile demo branch, live integrations, Supabase configuration, or production migrations.

## Automated validation

`src/features/project-operations/model.test.ts` tests firm-demo record independence, cost math, duplicate imports, idempotent reconciliation, employee review gating, vendor approvals, allocation-share validation, and disabled integrations.

`.github/workflows/alec-project-operations-ci.yml` runs build, TypeScript check and these Vitest tests for the V1 branch/PR. CI never deploys.

## Integration requirements before any production pilot

Implement durable, audit-logged firm-scoped project tables and APIs; prohibit cross-firm reads/writes at the database layer and verify user/role authorization on every mutation. Resolve project/employee/source ID mappings and PM permission ownership. Build credential vaults and granular OAuth permissions, reconciliation to authoritative ERP/PSA data, expense evidence matching, invoice approval/contract validations, safe retry keys, webhook signatures, task/event deletion handling, currency and time-zone handling, and audit trails. Stage and prove an independent release test plan before enabling any external action.

The existing default branch tracks a `.env` file. Its contents were not inspected or copied for this feature; the repository owner should audit it and rotate any actual exposed secrets before any external provider activation.

## Explicit exclusions and review gate

This PR must remain **draft and unmerged** until separately approved. Do not publish from Lovable, apply database migrations, send external email, process actual payments, book travel, import real accounts, or connect to production tenant data. No change to the mobile demonstration scope is authorized here.
