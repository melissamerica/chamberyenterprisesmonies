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
- No user accounts: the source prototype was open-access. Tables have RLS enabled with no policies so only server code can read/write.
- Product rules and history from the source are in docs/source-handoff/ (read SOURCE_AGENTS.md and COLLABORATION.md before changing behavior).
- OCR language data is a hosted asset (src/assets/eng.traineddata.gz.asset.json) because it exceeds the repo file limit.
- Keep the official numbered requirements survey and answer ledger in docs/requirements-survey.md; consult it before new survey questions so confirmed answers remain portable and are not repeated.
