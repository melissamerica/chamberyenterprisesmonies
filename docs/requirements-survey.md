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
| Q002 | Which three repetitive EA tasks must Anya remove first for you to consider it useful? | Pending |
| Q003 | Besides the EA, who should use the workspace, and what work should each person actually do there? | Pending |
| Q004 | In a typical week, how many executives and active trips does one EA manage? | Pending |
| Q005 | When you open Anya each morning, which information must be visible immediately? | Pending |
| Q006 | What exactly makes an item urgent enough to appear in Needs attention, and what determines its priority? | Pending |
| Q007 | When another EA covers for you, what must the handoff show so they can continue without asking you? | Pending |
| Q008 | Which devices do you use for which tasks, and what must an executive be able to do on their phone? | Pending |
| Q009 | Where do trip requests and booking documents arrive today—email, travel agency, booking portal, messages, paper or elsewhere—and which sources matter first? | Pending |
| Q010 | Which intake methods should be available first: uploading files, forwarding emails, pasting text, scanning receipts or importing from another tool? | Pending |
| Q011 | For a batch containing documents for several executives, how should Anya help you review and separate them while keeping explicit executive confirmation? | Pending |
| Q012 | What work must carry over when you switch devices or another EA takes over, and what should happen if two EAs edit the same trip? | Pending |
| Q013 | If a document names someone other than the selected executive, what should Anya show and what choices should you have? | Pending |
| Q014 | What defines one trip in your work, especially with several cities, several clients or personal days mixed in? | Pending |
| Q015 | Beyond executive, dates and city, what information would make a suggested trip match trustworthy to you? | Pending |
| Q016 | When several trips look plausible, what details should the comparison show before you confirm one? | Pending |
| Q017 | When creating a trip, what information must be required, and what should its suggested name contain? | Pending |
| Q018 | After you confirm a trip, which outputs should be prepared automatically, and which should stay drafts for another review? | Pending |
| Q019 | If a revised booking arrives, how should Anya present the old and new details before you accept the change? | Pending |
| Q020 | Who receives each finished output, in which format or destination, and what must you check before it is ready to share? | Pending |

## Answer progress
- Questions drafted: 20 / 200.
- Answers recorded: 0 / 200.
- Next action: Melissa answers Q001–Q020, all at once or in smaller groups. Record answers before preparing checkpoint 2.