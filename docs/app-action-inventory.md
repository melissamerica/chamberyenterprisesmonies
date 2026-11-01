# Anya — detailed existing action inventory

Reviewed November 1, 2026 against the current migrated source. This is descriptive, not authorization to change behavior. Line references are navigation aids and can move. **B** = React/browser-held state; **S** = server-backed request. A later server save of a trip does not make its earlier browser-only creation durable.

## Entry, navigation and executive context

| Action | Existing behavior and state path | Source |
| --- | --- | --- |
| Open workspace | `/app` requires sign-in, then a firm; renders `TestWorkspace` keyed by firm. `/test` redirects there; recognized root query destinations redirect there. The old wrapper in `src/anya/page.tsx` is not the current root route. | `src/routes/_authenticated/route.tsx:4–10`; `app.tsx:21–30`; `src/routes/test.tsx:4–6`; `src/routes/index.tsx:9–16` |
| Home upload | Real chooser/drop control; explicit executive selection, with sole-profile initial selection. Retains pending files until executive selection renders. Blocks intake while saved profiles/trips load or fail. | `src/components/home-document-upload.tsx:8–24`; `src/anya/page.tsx:693–708,1364–1366` |
| Executive selection | Opens that executive's workspace/trip list. Home selection is captured intake context, but a recognized passenger matching another known executive can supersede it during travel parsing. | `src/anya/page.tsx:715–723,750–772,1155–1160` |
| Create executive | Validates trimmed name and case-insensitive duplicate, normalized ranked preferences and custom-provider questionnaire; S PUT profile, then B update on success. Failure retains draft. | `src/anya/page.tsx:973–995`; `src/lib/executive-profile-records.ts:1–125` |
| Edit executive | Shared profile normalization/validation and S PUT. This handler edits profile/contact/preferences, not the executive's name. | `src/anya/page.tsx:996–1014` |
| Sample loader | Explicit action appends absent fictional executives/trips in B; preserves existing records. Not automatic startup seeding. | `src/anya/page.tsx:1016–1020,1390` |
| New trip | Creates empty trip for selected executive in B. No immediate server save. Trip filters derive Draft/Past/Upcoming from timestamps, not a full close/archive lifecycle. | `src/anya/page.tsx:413–422,677–690,1481–1494` |
| Appointment | Requires title, optional date; B append. No exact editable start/end/location workflow or immediate S save in this handler. | `src/anya/page.tsx:834–847,1460` |
| Assistant tools | Optional `document.modelContext` exposes trip/appointment tools; B mutations. Tool trip can use an executive name absent from directory; appointment supplies display wording rather than exact timestamps. | `src/anya/page.tsx:586–671` |

## Recognition → review → filing

| Stage/action | Actual gate, read/write and result | Source |
| --- | --- | --- |
| Queue | Promise-chain serializes batches; waits for each review before next file. Home and executive entry points reuse it. Trip-row drop is not unconditional assignment. | `src/anya/page.tsx:693–733,1490–1506` |
| Recognition | Rejects empty/>20 MiB input. Content routes calendar, travel, billing, expense, uncertain review or supporting attachment. Filename alone is not a type-selection system. Reader failures stay reviewable. | `src/lib/automatic-upload.ts:9–50` |
| Extraction | PDF position-based text spacing preserves table columns; low-text PDFs/images use English OCR. EML/HTML cleanup, labeled bookings and aligned tables are supported—not arbitrary semantic understanding of all formats. | `src/lib/travel-confirmations.ts:26–182`; `src/anya/page.tsx:132–280` |
| Travel matching | Known passenger/selected executive; open trips only. Booking reference ranks strongest; dates and destination next. Past does not automatically mean closed. | `src/lib/travel-trip-matching.ts:4–31`; `src/lib/workspace-uploads.ts:18,64–71`; `src/anya/page.tsx:750–765` |
| Travel confirmation | Select existing trip or named new trip, or Skip. Re-reads current trip ref after answer; preserves unrelated items. Review corrects trip choice/name, not parsed booking facts. Target existence/open status is rechecked. | `src/components/travel-import-review.tsx:9–25`; `src/anya/page.tsx:767–795` |
| Travel save | B append + browser autosave; no upload API save in this import branch. Separate legs retain dates/times/seats; only first flight item expense-eligible to count fare once. | `src/anya/page.tsx:750–752,774–795,567–575` |
| Travel duplicates/revisions | Chosen-trip equality is title + start. Changed seat/end/fare with same title/start can be skipped; changed title/start can append. No integrated booking version comparison. | `src/anya/page.tsx:774–790` |
| Cancellation/incomplete booking | Goes to details review; confirming can create placeholder plus B attention item. Does not cancel/reconcile original reservation. Skip leaves trip/calendar unchanged. | `src/anya/page.tsx:739–746,810–830` |
| Expense intake | Saves source file S first, extracts rows, persists unassigned rows S. Proposed trip is not expense filing. File/rows remain on errors. | `src/components/executive-upload.tsx:60–75,89–112` |
| Receipt edits | Draft description/date/amount/trip edits recompute duplicate suggestion. Manually touched categories are protected from saved preference autofill. | `src/components/executive-upload.tsx:13–43` |
| Receipt confirmation | Requires description, date, finite entered amount and duplicate decision when relevant. Uses current open trip. New trip + first receipt submitted together. S decision save, then B callback. | `src/components/executive-upload.tsx:125–152`; `src/server-api/uploads/decisions/route.ts:7–30` |
| Receipt duplicate update | Matches amount/date/kind/title tokens, not a universal file-hash guarantee. Update retains booking facts, replaces expense/source/import fields and merges evidence; separate-entry choice appends. | `src/lib/workspace-uploads.ts:77–89,237–251` |
| Review later/exclude/routing | Separate durable decisions; optional vendor/city routing requires explicit scope. Refresh/retry persists suggestions/unassigned rows, never silently files receipts. | `src/components/executive-upload.tsx:114–118,125–156`; `src/lib/workspace-uploads.ts:15–40,306–322` |
| Review-history deletion | Removes review record, not an already filed expense. Forgetting vendor rule stops future routing, not prior filing. | `src/components/executive-upload.tsx:154–170` |
| Calendar import | ICS source saved; clear relevant entries can auto-enter itinerary, optional/unclear rows require selection. UID/import keys prevent repeat inclusion. This existing exception does not remove receipt review gates. | `src/components/executive-upload.tsx:89–103,120–123`; `src/lib/workspace-uploads.ts:157–228,241–249` |
| Unknown → material | Explicit “This is itinerary material” action opens attachment review; unreadable files are not automatically attached. | `src/anya/page.tsx:1343` |
| Attachment review | Blank executive/trip choices; validates current ownership; S trip save then S attachment upload, entry 0/N/A. Two requests can partially succeed. Retry retains file. Selector does not filter closed trips. | `src/components/attachment-upload-review.tsx:10–40` |
| Attachment tab | Saves trip, uploads files sequentially; successful files removed individually, failures retain remainder. Reassignment, preview and download exist; no delete handler here. | `src/components/itinerary-attachments.tsx:10–45` |
| Materials indicator | Attached/digital/hard copy/both is item metadata, separate from file upload. S whole-trip PUT; B patches fields only after success, with lock and explicit error. | `src/anya/page.tsx:510–523,1446–1464` |

## Learning, billing, templates, approvals and outputs

| Action | Current semantics | Source |
| --- | --- | --- |
| Explicit category preference | Executive-scoped exact normalized vendor; precedence trip > vendor/city > executive/vendor. Conflicting strongest preferences abstain. Separate from inferred observations and vendor trip-routing. | `src/lib/expense-learning.ts:3–19,53–65` |
| Inferred category | Local nearest-neighbour logic; same executive, earlier evidence, city, merchant similarity ≥ .65, ≥3 distinct observations, ≥80% weighted agreement; max 20 neighbours. Does not select trip. Only confirmed preferences auto-apply to untouched categories. | `src/lib/expense-learning.ts:48–98`; `src/components/executive-upload.tsx:35–43` |
| Pause/forget/restore | Pausing inference leaves explicit preferences active. Evidence forget/restore is not expense rollback. Classifier runs locally but evidence/preferences have server APIs/storage. | `src/lib/expense-learning.ts:57–67`; `src/components/expense-learning.tsx:51`; `src/lib/expense-learning-storage.ts:1–37` |
| Billing catalog | S add/edit/archive/restore and many-to-many executive links. Linking does not set report default. Import has editable sheet/column/row review; stale catalog rejects rather than partial save. | `src/components/billing-code-library.tsx:18–55`; `billing-code-import.tsx:10–19`; `src/server-api/billing-codes/import/route.ts:5–21` |
| Report billing | Default + line overrides. Endpoint reloads saved trip when present; stores label snapshots so catalog renaming does not rewrite historical wording. | `src/server-api/billing-codes/assignments/route.ts:8–23`; `src/lib/billing-codes.ts:1–37` |
| Reference template | Editable detected bindings and fixed wording; manual correction, scoped reservation formats. Not pixel-perfect reproduction. | `src/components/visual-template-import.tsx:1–78`; `src/lib/executive-profiles.ts:145–160,188–210` |
| Save/assign template | Central save and separate assignment. Assignment selection replaces recipients for that template: omitted previously assigned executives reset to defaults. Library overwrite is not exposed version/revert history. | `src/anya/page.tsx:1047–1125`; `src/lib/custom-template-storage.ts:13–62` |
| Approval packet | Review clones trip and gathers classified receipt/statement evidence. Save corrections S. Send currently returns 409 because live connections disabled, before request/send lifecycle begins. Saved approval workbook download uses stored snapshot, not mutable current trip. | `src/components/expense-approval.tsx:19–34`; `src/server-api/expense-approvals/route.ts:8–32` |
| Word/Excel | Client-generated actual editable DOCX and XLSX. Excel includes billing/source evidence/formulas and “Amount missing”/“Known total”; currency formats use dollars and raw sums, not conversion. | `src/anya/page.tsx:850–861`; `src/lib/travel-exports.ts:9–118` |
| Calendar preview/publish | Show As/Reminder work when template callbacks exist. Start/end read-only; All-day/zone checks and some ribbon labels non-mutating. Eastern wording fixed. Live publish disabled client and server. | `src/components/travel-output.tsx:14–29`; `src/lib/executive-profiles.ts:167–185`; `src/anya/page.tsx:864–895` |
| Attention/reminder | Generated attention B-only; dismissed IDs stored. Open/view-trip navigates locally. Disconnected reminder opens external calendar draft requiring user save; not an automatic send. | `src/anya/page.tsx:394–403,577–584,920–960,1240–1287` |

## Persistence contract as written—not desired future contract

- Browser hydration reads unscoped trip/profile/selection/calendar/dismissal keys; browser save errors are swallowed. `src/anya/page.tsx:434–468,567–584`.
- Server profiles and uploads load separately; errors block intake. `src/anya/page.tsx:471–500,693–696`.
- `mergeUploadedTrips` preserves browser trip metadata/items while replacing matching imported items and selected expense/material fields. Not authoritative full server replacement. `src/lib/workspace-uploads.ts:325–327`.
- Whole-trip server saves use batch upsert and corresponding pending-expense removal. Receipt decision batches include trip/deferred/exclusion/rule/learning changes. `src/lib/upload-storage.ts:26–29,45–59`.
- Current API adapters attach a verified tenant context; browser API fetch wrapper adds session bearer token. This is source behavior, not proof of cross-firm isolation. `src/lib/firm-fetch.ts:5–18`; `src/server/tenant.ts:24–50`.
- Settled desired durability, currency, booking revision and lifecycle rules in the official record are **not evidence those fixes were implemented**.

## Verified in this review

- Executed current Vitest files: `src/test/app-routing.test.tsx` and `src/lib/firm-roles.test.ts`: 4 tests passed November 1, 2026. Route test only matches root; it does not run loaders or render.
- Signed-in read-only browser visit to `/app`: empty executive workspace loaded, real intake/create controls and explicit sample loader present, no page errors. Screenshot inspected. No records created/edited/deleted; no upload/export flow was exercised.
- Handoff regression scripts remain under `docs/source-handoff/tests/`; their root `lib/`, `app/` and old runtime assumptions are not automatically current tests. Historical pass reports remain historical.
- Not runtime-verified here: OCR, nonempty trip imports/receipt saves, export contents, refresh durability, provider delivery, cross-firm isolation, or staged executive workflows. No app behavior changed.