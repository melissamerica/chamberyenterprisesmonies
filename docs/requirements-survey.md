# Anya — official requirements survey

## Recording rules
- Requested by Melissa on November 1, 2026: 200 questions, delivered in 20-question checkpoints to control credit spend.
- This source-held document is the official survey and answer record. Preserve question IDs, record Melissa's actual answers, distinguish interpretations from confirmed requirements, and mirror durable decisions in project memory.
- Check this record and source-handoff requirements before asking questions. Do not repeat settled questions. An unanswered or skipped question stays unresolved; never treat silence as approval.
- Purpose (clarified by Melissa, November 1, 2026): the survey exists to clarify and then implement features, functions, rules and roles. Confirmed answers become the build specification; implement what they settle, in checkpoint-sized steps Melissa can review.
- Confirmed answers still do not authorize publishing, connecting live services or enabling the Executive time tracker; those need separate explicit approval.
- Current focus: useful, aesthetically pleasing EA workspace functions and workflows for other users. Signup, sales, pricing, security claims, demo notifications and per-client SAML are deferred.

## Review method
Review relevant source flows for each checkpoint, from input to review/save to output. Record observed implementation separately from desired behavior. Source inspection is not end-to-end verification.
- Method change (Melissa, November 1, 2026): every question must be derived from a concrete shortcoming or hole found in the app code — not generic EA-workflow questions, and never ask Melissa to re-specify what the code already does ("you're asking me to recreate the wheel"). Each question cites the gap it comes from and includes a proposed answer/behavior for Melissa to confirm or correct. Q002 onward re-derived from the gap audit; Q001 stands as answered.

## Checkpoint map (200 questions total)
1. Q001–Q020: EA workday, collaborators, intake and trip decisions.
2. Q021–Q040: Executive profiles and preferences.
3. Q041–Q060: Document recognition, extraction and correction.
4. Q061–Q080: Trip lifecycle, changes and exceptions.
5. Q081–Q100: Itinerary content and attachments.
6. Q101–Q120: Calendar content, time zones and future delivery requirements.
7. Q121–Q140: Expenses, receipts and statements.
8. Q141–Q160: Billing allocations and approval workflow.
9. Q161–Q180: Templates, output formats and remembered decisions.
10. Q181–Q200: Attention queue, collaboration, workspace presentation and acceptance criteria.

Later questions are not yet drafted; adapt them to previous answers to avoid repetition.

## Existing settled requirements — do not re-ask
- Preserve functional controls and saved records. Empty workspaces do not automatically load samples.
- Use Chambery-inspired fonts/colors and the approved brand identity; mascots sparingly.
- Uploads recognize contents, not a user-selected document type. Preserve explicit executive context and review.
- Confirm a trip or named new trip before filing travel confirmations, receipts or statement transactions. Unreadable/ambiguous files remain in review, not automatically attached.
- Preserve skip, Review later, duplicate handling, vendor memories, manual correction and existing calendar-to-itinerary inclusion.
- Billing codes are central, with report defaults and line overrides, many-to-many executive links, reviewed imports and preserved historical assignments.
- Reference-based templates remain editable reviewed drafts with executive assignments and scoped calendar formats.
- Automation takes priority over optional learning; learning must not autonomously choose trips, delete expenses or send messages.
- Executive time tracking requires separate explicit authorization. Live calendar/email sends remain disabled.

## Checkpoint 1 — Q001–Q020

### Source findings
- `src/anya/page.tsx`: executive and trip workspace orchestration; flight, hotel, car, appointment and expense records; optional samples.
- `src/lib/automatic-upload.ts`: content-based routing for travel, expenses, calendar, billing, attachments and review. Unreadable files return to review; current per-file cap is 20 MB.
- `src/components/travel-output.tsx`: calendar, itinerary and expense previews with source evidence and materials indicators.
- `src/lib/travel-exports.ts`: Word itinerary and Excel expense report generation. Current monetary formatting uses dollar signs; do not assume this meets international firm needs.
- `docs/source-handoff/SOURCE_AGENTS.md` and `COLLABORATION.md`: existing approval-before-filing, billing, template, intake and learning requirements.
- These are source observations, not a new claim that all paths have been tested.
- Focused review also found mixed browser-held/API-backed trip state, limited manual appointment fields, unresolved cancellation reconciliation and exact-title/start duplicate checks. Continuity, manual editing and revision handling need explicit expectations before implementation; inspect `src/anya/page.tsx` around trip persistence, manual creation and travel import.

Answer in your own words; examples and “not sure” are welcome. All answers below are pending.

| ID | Question | Official answer |
| --- | --- | --- |
| Q001 | Walk me through one real trip you manage, from the first request through closing its expenses: where does your work begin and end? | Answered Nov 1, 2026: "The app code answers that." The existing code is the source of truth for the trip workflow: documents/requests arrive → content-based recognition (`automatic-upload.ts`) → review and confirm the trip before filing → records filed to the trip → itinerary, calendar and expense outputs (`travel-output.tsx`, `travel-exports.ts`) → expenses reviewed and closed. Changes to this flow must be proposed against the code, not assumed. |
| Q002–Q020 (original drafts) | Generic EA-workflow questions | Superseded Nov 1, 2026: Melissa directed that questions come from app shortcomings/holes, not generic workflow questions. Replaced by gap-derived questions below. |

## Gap register — code audit, November 1, 2026
Ranked by severity. Each gap becomes one or more survey questions with a proposed rule for Melissa to confirm or correct. Evidence citations live in the audit; key files: `src/anya/page.tsx`, `src/lib/workspace-uploads.ts`, `src/server-api/uploads/route.ts`, `src/server/tenant.ts`, `src/lib/workspace-mode.ts`, `src/lib/travel-exports.ts`, `src/lib/firm.functions.ts`.

**Data loss / integrity**
- G01: Browser-cached workspace data is not scoped to a user or firm — signing into another account in the same browser can expose/mix the previous workspace.
- G02: Manual trip creation, travel imports, manual appointments and report creation show "saved" but only persist to browser storage; invisible to teammates and other devices.
- G03: Server hydration keeps stale browser records and misses server-only itinerary items; no authoritative merge rule.
- G04: Concurrent editing silently overwrites — whole-trip snapshot saves with no revision/conflict handling.
- G05: Creating a new expense report silently replaces the existing one, dropping its approval reference.
- G06: Viewer role is read-only on the server but the UI lets viewers "edit" locally and shows success.

**Broken / misleading flows**
- G07: Cancellations go to a review queue with no matching to the original reservation; attention items vanish on reload.
- G08: Duplicate detection matches only exact title+start — changed bookings silently ignored, rebookings double-counted.
- G09: Manual appointments take only a title and optional date — no time, location, or editing; can't be published to a calendar.
- G10: Calendar publishing and approval email are hardcoded off, not firm-configurable.
- G11: Published calendar events have no update/delete path for changed or cancelled bookings.
- G12: Calendar publishing hardcodes New York time regardless of trip destination.
- G13: The event editor shows controls (all-day, time zone) that look editable but are inert.

**Missing capabilities / undefined rules**
- G14: No trip lifecycle API — no rename, close/reopen, archive, or delete.
- G15: Owner/admin/editor have identical workspace write powers; roles only differ in team management.
- G16: Billing-code validation is bypassable through generic trip saves.
- G17: Remembered expense decisions can silently suppress later documents; user sees only a count.
- G18: Learned decisions are recorded as "workspace_user", not the actual person — no accountability.
- G19: Expenses have no currency field at all — amounts in different currencies would be summed as if equal.
- G20: Template import approximates layouts; it cannot reproduce a firm's actual template.
- G21: Upload format/size rules are inconsistent between browser and server (20 MB cap; some accepted formats get no extraction).
- G22: Firm creation/invitation/member-removal can report success when the database write failed.

## Gap-derived questions
| ID | Gap | Question | Official answer |
| --- | --- | --- | --- |
| Q002 | G01+G02 | First framing rejected Nov 1, 2026: "What teammates. I've never once mentioned teammates in this design. Never." Settled rule: the Anya workspace is a single-EA tool; do not frame workspace features around teammates, sharing or multi-editor editing. Firm accounts/roles are the enterprise sales layer only. Underlying gap (browser-only saves, cross-account cache mixing) re-asked as Q003 in single-EA terms. | Answered — framing rule settled |

## Answer progress
- Q001 answered; Q002+ being re-derived from the gap register, asked one at a time.
- Answers recorded: 0 / 200.
- Next action: Melissa answers Q001–Q020, all at once or in smaller groups. Record answers before preparing checkpoint 2.