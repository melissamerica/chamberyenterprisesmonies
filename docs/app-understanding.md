# Anya — source-grounded app understanding

Read-only review, November 1, 2026. This is a navigation aid to the actual source and recorded requirements, not a new specification or proof of live behavior. Read the relevant implementation before changing it. Later explicit Melissa decisions override older source-era instructions.

## Product, not a generic productivity app

The central thesis is **Anya becomes the Executive Assistant; the human EA becomes the Chief of Staff**. Automate repeatable administrative execution so the human can lead priorities, prepare decisions and follow through. Executive judgment remains human. The existing travel workspace is the operational foundation, not the whole product vision.

The EA workspace is a single-EA tool. Firm accounts and team-management roles were added as an enterprise sales layer; they do not imply Melissa requested a shared multi-editor workspace. Executive decision ownership and explicitly scoped delegates are separate concepts in the future operating layer.

Authoritative references:
- `docs/source-handoff/SOURCE_AGENTS.md`: preserved workflow requirements.
- `docs/source-handoff/COLLABORATION.md`: source-era changes and verification limits.
- `docs/requirements-survey.md`: later answers, delegated rules, signature feature index and STOPPED survey status.
- `docs/source-handoff/execos-staging-not-deployed/Master_Document/Anya_Master_Future_Features_and_ExecOS_Engineering_v4.docx`: consolidated future-feature blueprint, not a claim of implementation.
- `docs/source-handoff/product-specifications/Anya_ExecOS_Master_Future_Features_Anya_and_Alec_v5.docx`: later consolidated proposed blueprint, including Alec in §25. The survey cites v4; retain v5's additional scope without treating proposed behavior as shipped or overriding newer explicit decisions.

## Actual workspace: input → decision → output

### Smart Drop and travel confirmations

`src/lib/automatic-upload.ts` reads document contents and routes travel, expenses, calendar exports, billing-code lists, ordinary supporting materials or uncertain documents. This is not a document-type selection form. An unreadable or ambiguous document returns to review; it is not automatically treated as an attachment.

`src/anya/page.tsx` serializes intake, retains the selected executive for Home uploads and hands files to existing review paths. Travel parsing extracts bookings, finds the executive and suggests open trips. The EA confirms an existing trip, creates a named trip or skips **before** trip changes. It re-reads current trip state after the answer. A round-trip flight produces separate legs; fare eligibility is limited to the first flight item to avoid counting the fare twice.

Confirmed records feed calendar-entry previews, itinerary and expense outputs. `src/components/travel-output.tsx` renders those outputs; `src/lib/travel-exports.ts` creates an actual Word itinerary and Excel expense workbook. Preparing a preview/export is not publishing a calendar event.

### Expenses and evidence

`src/lib/workspace-uploads.ts` extracts transaction rows, proposes trips using booking references or travel dates and flags possible existing expenses. Receipts and statement rows retain explicit trip-review gates. Review later, unassigned transactions, exclusions and vendor/city routing memories are existing concepts, not features to ask Melissa to invent.

Expense outputs distinguish statement-only evidence from a separate receipt, retain source links and show missing amounts rather than silently treating them as known. Billing codes have central management, executive links, report defaults and individual-line overrides. Saved historical assignment wording must survive catalog changes. Approval constructs and signatures exist; live approval delivery is not enabled by their existence.

### Preferences, reusable outputs and memory

Executive profiles contain ranked hotel, airline and car-rental preferences, custom-provider questionnaires and rewards information. `src/lib/executive-profiles.ts` handles reusable output templates, substitutions and reservation-specific calendar formats.

Reference uploads create **reviewed editable template drafts**, not pixel-perfect reproductions. Flight-only calendar formats must not overwrite hotel, car or appointment formats.

`src/lib/expense-learning.ts` is a local feedback-trained classifier, not an external autonomous AI system. It keeps explicit category preferences separate from inferred patterns, scopes evidence by executive and relevant context, explains suggestions and abstains on conflict or insufficient evidence. Category learning does not choose a trip. Optional learning must not become another mandatory training chore; automation comes first.

## Signature features beyond the current workspace

The master blueprint's F01–F12 includes:
1. Exception-first EA homepage, Smart Drop and Needs Attention.
2. Automatic **travel-only** Outlook/Gmail intake.
3. Versioned trip bible: itinerary, calendar, documents and approvals, with EA review gates.
4. “Where in the World Is…” actual licensed live flight positions, with stale/unavailable states.
5. Executive “Snap Receipt” camera intake, proposed automatic filing to a draft when clearly matched.
6. Expenses, billing, reports and background memory.
7. Executive mobile Decision Queue: one decision-ready card at a time, with voice/video reply available on every question.
8. Executive-initiated Let's Talk, Call/Video if Free and callbacks; Teams/Meet/Zoom integration.
9. Explicit delegation modes: Request Input, Delegate Decision, Assign Execution.
10. Human-configured decision delivery now, at a chosen time or relative to a named event; not algorithmic meeting scheduling.
11. Explainable contextual memory, distinguishing confirmed instructions from inference.
12. Chief of Staff layer: morning brief, commitments, briefing preparation and priority stewardship.

The executive Decision Queue has actual **staged code**, under `docs/source-handoff/execos-staging-not-deployed/src`, not a reachable production workspace feature. Its recording preview is local, its identity boundary intentionally fails closed and its delegation saves pending delivery rather than claiming a message arrived. Audio/video replies do not automatically constitute approval or completed work. Deferred decisions and callbacks remain unresolved obligations.

The blueprint explicitly labels mailbox automation, real flight tracking, mobile receipt capture and the broader operating layer as future work. Do not confuse standalone HTML demonstrations or product-page illustrations with functioning integrations.

### Alec is a different operating experience, not Anya with renamed labels

The v5 blueprint §25 defines Alec for senior managers/new VPs **without a dedicated EA**. It proposes the same ExecOS engine and relevant travel, expense, evidence, connector and learning capabilities, but the manager is the initiator and final decision-maker. Its personal dashboard centers on My Decisions, My Trips and My Follow-through; own-flight tracking replaces Anya's multi-executive rail. Receipt review and operational decisions go directly to the manager, with separate finance approvals preserved. No assumed EA, Chief of Staff or delegates; no default “call my EA” action. Delegation is only to actually authorized contacts. A future transition to Anya should preserve trip, receipt and audit history. Current `/alec` is a product/early-access page, not an operational Alec workspace.

## Important implementation boundaries already identified

- Workspace trip state mixes browser storage and server-backed paths. Travel imports in `src/anya/page.tsx` update React/browser state; expense/materials paths include server saves. Do not claim all trip changes already save durably to the firm. Durable account-scoped saves are a settled desired rule, not established completion.
- Current travel duplicate checks compare title and start time; cancellations enter details review without full original-booking reconciliation. Revised-booking comparison and proactive cancellation alerts are recorded desired behavior, not finished features.
- Current expense previews/exports use dollar formatting; the recorded currency requirement is not proof that currency-aware storage/totals exist.
- Existing calendar rendering includes fixed Eastern-time wording and read-only imitation controls. Recorded reservation time-zone and working-control requirements must not be mistaken for implemented fixes.
- The future Snap Receipt auto-file-to-draft proposal requires an explicit policy change from current receipt trip-confirmation gates. Neither silently overrides the other.

## Non-negotiable limits and current working method

- No general inbox triage, autonomous calendar reshuffling, routine/focus defense, algorithmic scheduling links or employee workload/utilization dashboards.
- Live calendar/email sends stay disabled. Executive time tracker stays deferred until Melissa explicitly authorizes it.
- Preserve records and working controls; examples load only through explicit sample actions.
- Chambery styling and brand decisions supersede older navy-based source-era presentation guidance.
- The survey is stopped. Do not restart it, ask Melissa to identify already documented features or seek confirmation of obvious requirements.
- Prioritize signature functions over signup, pricing, security copy and infrastructure detail. Read this map, official answers and relevant code before proposing work.
- This review authorizes no app changes, live delivery, publishing or new integrations. Source inspection is not end-to-end testing.