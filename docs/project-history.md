# Anya and Alec — history, ambitions and current boundaries

Reconciled November 1, 2026. This record links evidence, rather than making chat recollection the only source of continuity. Later explicit Melissa decisions override older source-era instructions; current implementation is evidence of what exists, not proof that it meets every desired rule.

## Source-era development history

| Stage | Preserved work and intent | Evidence |
| --- | --- | --- |
| v44–v45 foundation | Real application, not static reconstruction; preserve controls, saved records and source portability. | `docs/source-handoff/SOURCE_AGENTS.md:3–7`; `COLLABORATION.md:3–7` |
| v48 PDF intake | Column-aware round-trip table parsing; leg-specific facts; fare once; explicit trip review/skip. Original verification historical. | `COLLABORATION.md:32–54` |
| v49 Home intake | Compact real Home upload; retained pending files and executive context; same reviewed workflows as executive upload. | `COLLABORATION.md:60–66` |
| v50–v51 presentation | Navan-inspired communication, not copied identity; “Every trip, thoughtfully organized.” Examples illustrative, automation and remembered preferences grounded in actual behavior. | `COLLABORATION.md:68–80` |
| v52 separate public page | Public product presentation separate from workspace; source-era `/test` open access. This route/account description is now historical. | `COLLABORATION.md:82–88` |
| v53 learning | Automation first; executive-scoped category evidence/preferences, explanations and forget/restore; no external autonomous model or mandatory training chore. | `COLLABORATION.md:90–100`; `docs/source-handoff/expense-learning.md` |

## Migration and later decisions

- Source archive migrated to TanStack with Cloud database/file adapters; original handlers retained behind matching API route adapters. Original business rows/files were not supplied by the code archive. Current route map: `src/routes/`; adapters: `src/server/runtime-env.ts`.
- October 31: Melissa requested enterprise SaaS for consulting firms and Chambery-inspired design. Current firm sign-in layer is added infrastructure, **not proof that the single-EA workspace became a shared multi-editor product**. Evidence: user chat October 31 18:32; November 1 01:08 rejection of “teammates”; official Q002.
- October 31: functions/aesthetics prioritized; signup, pricing, security claims, notifications and per-client SAML postponed. `docs/requirements-survey.md:8–9`; roadmap deferred section.
- November 1: generic survey questions rejected. Existing workflow is answered by code; obvious rules delegated; signature functions prioritized over plumbing questions. Official Q001–Q008 retain actual answers separately from interpretations.
- Q009 allows decision delegation conditionally, requiring behavior clarification; does not approve unspecified authority or delivery. Survey subsequently STOPPED. Do not revive historical “next question” instructions.
- November 1 02:22–02:23: never grasp at straws; contribute from existing code/status. Melissa identifies an existing feature and desired nuance; inspect and implement that scope rather than restarting discovery.
- Melissa clicked Publish after the migration. This review does not publish, change visibility or establish that later preview changes are live.

## Product ambitions already documented

**Anya:** operational assistant for the person caring for executives. Administrative execution elevates the human EA toward Chief of Staff; executive judgment stays human. Not general inbox management or an employee productivity tracker. v4 body P16–20; v5 P380–393.

**Alec:** senior managers/new VPs without a dedicated EA; manager initiates and decides. Proposed personal Decisions/Trips/Follow-through experience; no assumed EA/delegate directory. Shared engine does not mean identical screens. v5 §25, body P394–415.

DOCX paragraph references count direct body paragraphs, including empty ones. v4: `docs/source-handoff/execos-staging-not-deployed/Master_Document/Anya_Master_Future_Features_and_ExecOS_Engineering_v4.docx`. v5: `docs/source-handoff/product-specifications/Anya_ExecOS_Master_Future_Features_Anya_and_Alec_v5.docx`. Both were extracted including tables during this review.

## Capability status—not a delivery promise

| Capability | Current status and evidence |
| --- | --- |
| Smart Drop/trips/expense outputs/templates/preferences/billing/learning | Reachable existing workspace; detailed paths and limitations in `docs/app-action-inventory.md`. |
| “Where in the World Is…” | Anya far-right rail for user caring for traveling executives; HTML preview in `public/previews/Anya_World_Travel_Rail_Preview.html`. Licensed live positions planned, not connected in current app. Blueprint v5 §6/F04. No private/charter expansion discussion authorized. |
| Travel-only mailbox ingestion and Snap Receipt | Documented integration package, not functioning integrations merely because parser/photo helpers or demos exist. `docs/source-handoff/product-specifications/Anya_Travel_Automation_Live_Tracking_and_Receipt_Capture_Handoff_v2.md`. |
| Executive Decision Queue | Staged React/contracts/store/API code, not current route. One question/card, voice/video choices, request info/defer/talk/delegate. Identity stub throws; recording replies blocked until upload integration. Staged `src/components/ExecutiveDecisionQueue.tsx:8–65`, `src/server/auth.ts:7–14`. |
| Delegation | Staged authorized contacts and three modes; pending delivery only. Assign Execution blocked until independent prior approval verification. Staged `src/server/decision-store.ts:23–24,90–108,139–147`. |
| Let's Talk/voice/video/callback | Browser-local preview/manual availability, not real calendar availability or connected conferencing. `public/previews/Anya_Executive_Communications_Draft2_Voice_Video_Preview.html:15–32`. |
| Contextual decision delivery | Human chooses now/time/event-relative; not algorithmic meeting scheduling. Deferred reappearance scheduler future. v4 P160–166; staging README:60–62. |
| Chief of Staff layer | Morning brief, commitments, briefing preparation and priority stewardship documented, not reachable workspace modules. v4 P185–189, P336. |
| Alec workspace | `/alec` currently early-access product page, not operational personal workspace. `src/routes/alec.tsx:19–35`. |

## Guardrails that survive migrations

Preserve real controls/records, reviewed intake and output formats; automation before optional learning. No general inbox triage, autonomous calendar reshuffling, routine/focus defense or workload analytics. Live calendar/email sends remain disabled; Executive time tracker requires separate explicit authorization. Current working brand supersedes historical navy/by-Lissa presentation instructions, but this review changes no styling.

## Cleansed records and retained history

- Corrected current `AGENTS.md` no-account statement; kept original handoff unchanged as history.
- Corrected survey's obsolete pending/next-question/single-v4-source instructions without deleting actual answers.
- Corrected memory index's obsolete 20-question-checkpoint description; stopped survey remains stopped.
- Qualified selected-executive intake context, server-backed learning persistence and template replacement assignment semantics in the understanding map.
- `docs/development-context-research.md` describes continuity mechanisms and limits. No new AI service was built; source-based retrieval/checking is the immediate remedy.

## Verification and code-review boundary

Current route/role tests passed (4 tests); signed-in empty `/app` rendered without page errors. This is not verification of populated upload→trip→export behavior. Existing code has mixed browser/server trip saves, a large multi-job workspace page, broad snapshot saves and handoff-era regression scripts not wired to migrated paths; these confirmed patterns make durability/regression harder to reason about. No rewrite, refactor, dependency update or behavioral fix was performed.

Security scan results retrieved November 1: older non-deep scans reported no findings and were marked out of date; no recent deep-scan result was returned. A deep scan from the Security tab is needed for a current security assessment. No independent security review or “secure” claim is made here.