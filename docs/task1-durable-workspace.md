# Task 1 — firm-scoped and durable Anya workspace (draft PR #2)

**Status:** Proposed changes only; do not merge, deploy, publish, or run a production data migration without separate review. Source branch: `task1/firm-scoped-durable-workspace`.

## What changed
- `getMyFirm` returns the verified session user ID alongside firm ID; the Anya workspace is keyed by both.
- Local browser cache uses `chambery-workspace-v1:<encoded-user>:<encoded-firm>:<key>`, not the old unscoped prototype keys. Explicit sign-out clears the authenticated user's scoped cache only. The server is authoritative for the trip list after a successful API read.
- Legacy browser-only keys are **not read into a new account, deleted, exported to another account, or silently assigned to the firm**. The Home screen warns of their existence without showing their contents. Any migration must be supervised, preserve custom templates and metadata, identify the original owner, and handle duplicate trip IDs.
- The existing `/api/uploads` PUT route adds an optional guarded single-trip contract: `{ "trips": [trip], "ifMatch": null | "<exact server updatedAt>" }`. `null` creates only if the ID is new; a precise revision is required for updates. Stale or colliding writes return HTTP 409; nothing is overwritten. The response includes the saved trip and its new `updatedAt`. No schema change or data wipe.
- Guarded writes cover manual trip creation, appointments, reviewed confirmations, assistant-created records, samples, itinerary materials, expense draft corrections, and explicit report creation.
- Bulk receipt and calendar import now uses a single firm-scoped PostgreSQL RPC transaction with an all-or-nothing revision assertion; any stale trip aborts the entire batch. Successful responses return authoritative updated revisions to the browser.
- Individual receipt assignment, exclusion/defer, vendor rules and learning feedback preserve their existing behavior, but trip changes and dependent receipt decisions now commit together or roll back together on a version conflict.
- Attaching and reassigning itinerary files no longer pre-save stale trip snapshots. Server-side row locks and transactional metadata changes protect trip versions; failed uploads clean up the stored file.
- Billing-code assignments check the trip revision, and manual code edits enforce a saved revision; existing billing-code list imports retain their original guarded bulk import.
- Expense report creation prompts before replacing a draft; an existing approval record is protected.

## Verification
Run `bun install --frozen-lockfile`, `bunx tsc --noEmit`, `bun run test`, and `bun run build`. GitHub Actions executes these on the pull request. The new tests cover scoped-cache isolation/sign-out, guarded client calls, server create/update/stale-write behavior, verified tenant membership, and viewer-write rejection.

The expanded suite contains **38 passing tests**, including **8 executed against disposable PostgreSQL 16**, using the repository's actual 0000 and 0001 migration SQL and the `anya_exec` firm-scoped transactional executor. These integration tests exercise bulk multi-trip saves, stale-version rollback, individual receipt decisions, attachment insert/reassignment, concurrent writers, and firm isolation. The remainder use isolated mocks. This does **not** establish production Supabase deployment/configuration, authenticated browser behavior, or complete end-to-end confirmation/receipt/attachment UI coverage.

## Release blockers / follow-ups
1. Decide and verify safe ownership-based recovery of old local-only trip/profile/template records, including which firm receives them. Never just import old shared-browser keys into whichever user is signed in.
2. The disposable PostgreSQL transaction tests pass, including concurrent writers and firm isolation. Before release, repeat authenticated workflows against a separate **staging** deployment with the actual Supabase service configuration and backup/recovery controls; do not exercise production records.
3. Review remaining independent deferred/unassigned and approval workflows for reappearance of stale rows or races; these paths do not all use record-level revision checks.
4. Exercise signed-in user A vs user B, viewer role, two firms, booking upload → trip → generated documents and expense approvals using disposable test records. No live email/calendar sends.
5. Confirm environment credentials remain server-only, validate deployed row-level isolation, verify restoration/backups, and review security statements before customer onboarding.
6. The older prototype `AGENTS.md` / source handoff notes describe prior architectures and should not supersede current signed-in firm boundaries.

Existing Lovable and Git history are preserved. Do not force push or rewrite the synced branch.
