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

## Gap triage — November 1, 2026
Per Melissa's direction, gaps whose correct behavior follows obviously from her objectives are settled rules to implement, not questions. Settled without asking:
- G01–G04: durable immediate saves to the firm workspace; server is the system of record; account-tied browser cache wiped on sign-out (single-EA tool, so no multi-editor conflict model needed beyond server-wins). (Q003)
- G05: never silently destroy an expense report — warn and keep the existing one until confirmed.
- G06: viewer role must be genuinely read-only in the UI, not just on the server.
- G09: manual appointments get full fields (time, duration, location, notes) and are editable after creation.
- G10: live calendar/email sends stay off until Melissa explicitly authorizes (already settled).
- G12: event time zones come from each reservation, never hardcoded.
- G13: every visible control must work or be removed — no inert controls.
- G14: trips get a full lifecycle: rename, close/reopen, archive, delete.
- G16: billing-code validation enforced consistently on every save path.
- G18: learned decisions attributed to the real signed-in person.
- G21: one consistent upload format/size contract between browser and server.
- G22: firm/team writes must confirm the database write succeeded before reporting success.

Genuine judgment calls reserved for Melissa: G07 (cancellation handling), G08 (duplicate vs amendment vs rebooking), G17 (suppressed documents), G19 (currency model), G15 (role powers in workspace), G20 (template-import promise), G11 (calendar update/delete lifecycle — deferred with live sends).

## Gap-derived questions
| ID | Gap | Question | Official answer |
| --- | --- | --- | --- |
| Q002 | G01+G02 | First framing rejected Nov 1, 2026: "What teammates. I've never once mentioned teammates in this design. Never." Settled rule: the Anya workspace is a single-EA tool; do not frame workspace features around teammates, sharing or multi-editor editing. Firm accounts/roles are the enterprise sales layer only. | Answered — framing rule settled |
| Q003 | G01+G02 | Should every create/edit save durably to the firm's workspace immediately, with the browser cache account-tied and wiped on sign-out? | Answered Nov 1, 2026: yes — "Why wouldn't it be the rule based on my objectives." Settled rule: durable immediate saves, account-tied browser cache cleared on sign-out. Method rule added: when the correct behavior follows obviously from Melissa's stated objectives, record and implement it directly; only ask about genuine judgment calls. |
| Q004 | G05 | What should "new report" do when one exists? | Settled without asking (obvious from objectives): never silently destroy a report — warn and keep the existing one until confirmed. |
| Q005 | G07 | What should a cancellation do? | Answered Nov 1, 2026: Anya alerts the EA/chief of staff in her preferred way. Voice-dialing the EA is a desired future alert channel ("that will be a badass feature"); Alec gets an equivalent ("the trailer"). Cancellations must proactively reach the EA, not sit silently in a queue. |
| Q006 | G08 | How should a revised booking be treated? | Answered Nov 1, 2026: "Figure it out" — delegated. Decided rule: recognize the same booking by confirmation number/route/passenger, show old vs new side by side, EA accepts or rejects; never silently ignore changes, never double-add rescheduled bookings. |
| Q007 | G17 | What should happen to documents suppressed by remembered rules? | Answered Nov 1, 2026: reviewable list — auto-file them but keep a visible list the EA can open, review and undo; nothing truly hidden. |
| Q008 | G19 | What is the currency rule for expenses? | Answered Nov 1, 2026: receipts and card statements already list currency — "figure it out." Decided rule: read each expense's currency from the source document, store it with the expense, and total each currency separately with home-currency conversion noted on reports. |

## Answer progress
- Q001 answered; Q002+ being re-derived from the gap register, asked one at a time.
- Answers recorded: 0 / 200.
- Next action: Melissa answers Q001–Q020, all at once or in smaller groups. Record answers before preparing checkpoint 2.