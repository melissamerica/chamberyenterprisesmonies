<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Anya app (migrated from Next.js/Cloudflare)
- Original source handlers live in src/server-api/** and are exposed as TanStack server routes in src/routes/api.*.ts at the same /api paths; keep that 1:1 mapping so client fetch calls are unchanged.
- src/server/runtime-env.ts replaces Cloudflare `env`: DB emulates D1 (prepare/bind/batch) via the service-role-only `anya_exec` Postgres function (atomic batches, `?`/`?N` params); BUCKET emulates R2 on the private `anya-files` storage bucket. SQL must be Postgres-compatible.
- The imported prototype was open-access; the current /app requires a signed-in firm member. Keep ported workspace API calls behind withTenant; source-era no-account descriptions are historical, not current behavior.
- Product rules and history from the source are in docs/source-handoff/ (read SOURCE_AGENTS.md and COLLABORATION.md before changing behavior).
- OCR language data is a hosted asset (src/assets/eng.traineddata.gz.asset.json) because it exceeds the repo file limit.
- Keep the official numbered requirements survey and answer ledger in docs/requirements-survey.md; consult it before new survey questions so confirmed answers remain portable and are not repeated.
- Use docs/app-understanding.md as a source-navigation map before proposing workspace changes, then inspect the cited implementation and latest decisions; it separates current functionality from staged code and future intent to prevent repeating discovery or treating plans as shipped.
- Use docs/app-action-inventory.md for detailed current action/read/review/write/output paths and docs/project-history.md for provenance; verify relevant source before relying on line references because edits can move them.
- Maintain source-backed action knowledge with affected behavior changes; distinguish browser writes, server writes, source inspection, executed tests and observed UI so continuity does not depend on chat summaries.

## Approved-work safeguards and data authority
- Before any new implementation, present a specific plan and obtain explicit approval. Approval is only for the stated scope. Never merge to main, publish, enable live sends or change approved branding without separate approval.
- Firm workspace trip writes go through the authenticated `/api/uploads` tenant-bound API. A client must receive `{saved:true}` before saying that a manual trip, travel import, appointment or report was saved.
- Do not restore, merge, upload or delete historical `trip-workspace-trips`/`anya-executives` browser data automatically. It is unscoped and may belong to another account. `src/lib/workspace-durability.ts` supplies opt-in recovery helpers; legacy data remains untouched.
- Browser navigation preferences must be firm/user-scoped and cleared on sign-out. Do not use browser storage as the source of truth for business data.
- Review `docs/workspace-durability-phase1.md` and run its tests/acceptance checks before merging the staged durability change; it does not claim to solve cancellation alerts, concurrent edits or legacy template migration.
