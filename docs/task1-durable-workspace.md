# Task 1 — firm-scoped and durable Anya workspace (draft PR #2)

**Status:** Proposed changes only; do not merge, deploy, publish, or run a production data migration without separate review. Source branch: `task1/firm-scoped-durable-workspace`.

## What changed
- `getMyFirm` returns the verified session user ID alongside firm ID; the Anya workspace is keyed by both.
- Local browser cache uses `chambery-workspace-v1:<encoded-user>:<encoded-firm>:<key>`, not the old unscoped prototype keys. Explicit sign-out clears the authenticated user's scoped cache only. The server is authoritative for the trip list after a successful API read.
- Legacy browser-only keys are **not read into a new account, deleted, exported to another account, or silently assigned to the firm**. The Home screen warns of their existence without showing their contents. Any migration must be supervised, preserve custom templates and metadata, identify the original owner, and handle duplicate trip IDs.
- The existing `/api/uploads` PUT route adds an optional guarded single-trip contract: `{ "trips": [trip], "ifMatch": null | "<exact server updatedAt>" }`. `null` creates only if the ID is new; a precise revision is required for updates. Stale or colliding writes return HTTP 409; nothing is overwritten. The response includes the saved trip and its new `updatedAt`. No schema change or data wipe.
- Guarded writes cover manual trip creation, manually added appointments, reviewed travel confirmation additions, assistant-created trips/appointments, opt-in sample trips, itinerary materials, expense draft corrections, and explicit expense-report creation.
- Expense report creation prompts before replacing a draft; an existing approval record is protected.
- Saved upload/expense/attachment APIs retain their original workflows. This PR does **not** claim every existing write path now uses compare-and-swap.

## Verification
Run `bun install --frozen-lockfile`, `bunx tsc --noEmit`, `bun run test`, and `bun run build`. GitHub Actions executes these on the pull request. The new tests cover scoped-cache isolation/sign-out, guarded client calls, server create/update/stale-write behavior, verified tenant membership, and viewer-write rejection.

Tests are isolated/mocked; they do **not** establish live Postgres/Supabase tenancy enforcement, browser UX, or end-to-end confirmation/receipt/attachment import.

## Release blockers / follow-ups
1. Decide and verify safe ownership-based recovery of old local-only trip/profile/template records, including which firm receives them. Never just import old shared-browser keys into whichever user is signed in.
2. Inventory the remaining upload decision, receipt, attachment, billing and approval write paths, convert them to coherent server revision/transaction semantics, and test concurrent writes before claiming global overwrite protection.
3. Exercise signed-in user A vs user B, viewer role, two firms, booking upload → trip → generated documents and expense approvals using disposable test records. No live email/calendar sends.
4. Confirm environment credentials remain server-only, validate deployed row-level isolation, verify restoration/backups, and review security statements before customer onboarding.
5. The older prototype `AGENTS.md` / source handoff notes describe prior architectures and should not supersede current signed-in firm boundaries.

Existing Lovable and Git history are preserved. Do not force push or rewrite the synced branch.
