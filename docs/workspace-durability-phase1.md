# Phase 1 — firm-scoped workspace trip durability (review branch)

Status: **code staged for review only**. Do not merge/publish before checking the manual acceptance scenarios below. This phase does not establish production security or total enterprise readiness.

## Changes
- /app receives the verified firm and session-user identity. Sign-out clears only current-user scoped navigation preferences.
- The workspace no longer restores or writes historical unscoped browser copies of executives, trips, and calendar status. Normal account hydration comes from `/api/executive-profiles`, `/api/custom-templates`, and `/api/uploads` through authenticated tenant-aware handlers.
- Manual new trips, imported travel confirmations, incomplete booking reviews, manual appointments, the optional in-page assistant trip/appointment handlers, and expense report creation confirm an API write **before** claiming the change saved.
- Existing receipts, itinerary attachments, billing, templates and approval handlers continue using their pre-existing server APIs.
- Historical browser records remain **untouched**. A user may explicitly review and import missing trip IDs and executive profiles into the signed-in firm; an existing firm record is never overwritten by the unscoped cache. This is opt-in, not background migration.
- Replacing an existing expense-report draft requires confirmation. Server approval protections remain in place.
- Source tests: `src/lib/workspace-durability.test.ts`.

## Important preservation/remaining gaps
- Historic custom template layouts are **not** automatically imported. They remain in the original legacy browser storage until a separately approved migration handles their formats, associations and collisions. The UI explicitly warns about this.
- Existing unsaved browser-only material is not silently attributed to a new user or firm. A user must use the 'Review older browser records' action before it is copied to the current firm. Never delete legacy records as part of normal sign-out.
- New travel import source documents are still read in the browser, not saved verbatim to an upload file table by this handler; the normalized trip data is written. Keep a separate backup of originals.
- Some attention/cancellation records are still local React state; durable exception/alert workflows are a later task.
- Multi-editor concurrency and firm isolation need real integration/security testing; the existing single-EA design does not justify an assumed shared-editor model.
- A failed travel import save leaves the file uncommitted; the UI says so and the user must retry the upload. Manual trip/appointment/report editors stay open on save errors.
- Do not enable outbound email/calendar publishing or change brand/layout as part of this phase.

## Manual acceptance checks (not yet executed)
1. Sign in to Firm A as an editor with a fresh browser: no unscoped data appears. Create a trip and reload; it must remain in the firm API and UI.
2. Add an appointment, import a confirmation with an existing trip selected, and create a report. Each must survive reload. Force a 503 on each write: do not show 'saved'; manual editors retain input.
3. Sign out, sign in to another account/Firm B on the same browser. No Firm A trips, profiles or cached navigation are exposed.
4. If legacy browser keys exist, verify they are not read on hydration. Click Review, explicitly import a safe test set, and confirm matching firm IDs remain unchanged.
5. Simulate one failed imported record, retry, and verify only not-yet-imported IDs are submitted. Original legacy storage is not changed.
6. Confirm that reviewer/viewer cannot import records or write trips via the API, regardless of visible UI.
7. Test existing receipt/statement assignment, attachments, billing-code validation, signed expense approval and Word/Excel exports for regressions.
8. Test across browser reload and two separate devices; do not claim firm isolation or durability beyond these checks until backend staging verification completes.

## Local verification commands
```bash
bun install --frozen-lockfile
bun run test
bun run build
bun run lint
```

These commands have **not been executed** by the GitHub-only code-review session. The repository currently has no CI checks reporting for this branch. Testing requires an environment with dependencies installed; integration tests need a staging Supabase service with the existing tenancy migrations.
