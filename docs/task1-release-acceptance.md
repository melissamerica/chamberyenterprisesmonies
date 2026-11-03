# ExecOS Task 1 — Release acceptance and feature-development boundary

Status: **Draft PR #2; NOT APPROVED TO MERGE OR PUBLISH.** This checklist is a verification plan, not a deployment instruction. No production data, live email, or calendar publishing is authorized.

## Already verified — developer-controlled

- [x] Isolated browser-cache keys by verified user and firm; old unscoped keys remain untouched and quarantined
- [x] Server-authoritative trips and revisions; interactive stale writes fail instead of overwriting newer records
- [x] Bulk receipts/calendars use a single transaction with all-or-nothing revision checks
- [x] Individual receipt decisions and attachment updates use transactional safeguards
- [x] Approval decisions and signature persistence are transactionally consistent in disposable PostgreSQL tests
- [x] Existing classified receipts are not reinserted into the unassigned queue in tested sequential scenarios
- [x] Cross-firm row isolation and concurrent writes covered by disposable PostgreSQL 16 integration tests
- [x] Most recent completed PR validation before this checklist: **43 / 43 automated tests**, TypeScript and production build passed
- [x] Live sends disabled in source (`LIVE_CONNECTIONS_ENABLED = false`)
- [x] PR #2 remains draft and unmerged; no live release or production migration

## Still required before production — NOT verified

### 1. Staging environment and account boundaries
- [ ] Use a staging site plus an isolated database and storage bucket; never connect the test to production tables, buckets, messages, or credentials
- [ ] Confirm staging schema/migrations, tenant-membership rows, storage bucket ownership, and RLS RPC behavior match expected deployment
- [ ] Create disposable users A and B in firm A, user C in firm B, and a viewer in firm A
- [ ] Validate user and firm switching, sign-out, repeat sign-in, no A/B or cross-firm cache bleed
- [ ] Verify viewer cannot write through UI *or* direct API requests

### 2. Core end-to-end journey
- [ ] Use synthetic flight, hotel, and car confirmations → create trip → refresh browser → verify durable itinerary
- [ ] Import a synthetic travel-day calendar file; verify suggested, optional, duplicate and rejected entries
- [ ] Upload two sample receipts and a statement; verify review, duplicate handling, unassigned, deferred, exclude, billing code and report output
- [ ] Add an itinerary attachment, relink to another entry, download and preview; test interrupted upload and retry
- [ ] Generate DOCX itinerary and XLSX expense report; verify generated content is accurate for known samples
- [ ] Simulate two active EAs changing the same trip; verify the second receives a conflict without lost data
- [ ] Finalize a **test-only** expense packet with sending disabled; verify safe blocked state and correct approval snapshot
- [ ] Test report-return and decision transitions in a non-delivering environment, without sending external mail or calendar requests

### 3. Existing-data safety
- [ ] Inventory old browser-only trip, executive profile, template and preference keys for the **original owner** only
- [ ] Decide an owner-verified *opt-in* recovery/backup method; never expose older shared-browser records to an arbitrary signed-in account
- [ ] Validate ownership/firm destination before importing; resolve duplicate IDs without overwriting server records
- [ ] Confirm backup and restore from disposable staging data before any migration attempt
- [ ] Do not delete old browser keys or original records as part of Task 1 without explicit owner approval

### 4. Stop conditions
- [ ] No cross-firm leakage, permission bypass, lost receipts, stale overwrite, irreversible loss or unexpected live send in test evidence
- [ ] If any of these occur: **keep PR in draft**, log a reproducible defect with redacted inputs, fix and rerun the relevant acceptance check
- [ ] Require explicit owner approval to merge; **separate explicit approval** to deploy or publish

## What the owner needs to do now

**Nothing for coding or CI.** A staging login/test environment and confirmation of any legacy browser-data ownership are prerequisites only when moving to release acceptance. Do not ask for or use credentials inside source files or chat messages. A screenshot or ordinary account login does not authorize exposing or moving old data.

## Boundary for new feature development

**Feature design and implementation planning can start immediately in parallel** in chat or a dedicated planning branch. Actual code for an approved new feature must go on a **separate branch/PR**, must not be mixed into safety PR #2, and must follow the standing PLAN authorization rule (implementation plan, explicit approval, no publish by default).

From the existing feature register, the leading *candidate* for the next build is **AL-001 / AL-002 / AL-003**: Alec's company-provisioned, self-service traveler workspace reusing the now-durable travel intake, itinerary and expenses engine. This is a recommendation, **not a priority weight or authorization**. The owner has not filled in the feature-register weights; do not assign them without approval.

The future **AN-021 / AN-023 Executive Decision Queue / communications** is another distinct candidate, but implementation should not be conflated with the Alec-first audience decision.
