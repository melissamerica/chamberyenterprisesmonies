# App collaboration reminders

## Reminder at the start of every app work session

Briefly remind Melissa about her proposed **Executive time tracker**, a fourth tracker for each trip alongside the travel itinerary, calendar, and expenses. It would track executive time as data and support client billing with very specific, configurable rules.

This is an idea she is still thinking through. **Do not implement it until she explicitly authorizes it.** Do not invent time definitions, billable activities, rates, rounding, or client billing policies. This reminder was requested on October 19, 2026.

## Existing requirements

- Preserve existing functionality when changing appearance. Do not replace working controls with visual placeholders.
- Always provide a preview after a visual change or revert.
- The approved reconstruction uses the supplied Perplexity reference: Anya / The EA’s Assistant / by Lissa, navy-and-plum styling, and responsive navigation. The source remains the v44 foundation plus the preserved v45 upload improvements. Do not restore the superseded work-in-progress wordmark. New workspaces start empty; samples load only on an explicit action. Never delete existing records to simulate a fresh start.
- The shared root URL opens the public product homepage (latest instruction, October 29). The top “Continue to test workspace” link opens /test?view=home. Preserve the original app and its Home within that test route. Existing root query links to executives, trips, templates, expenses, billing and attachments retain their destinations.
- “Reports” appears as noninteractive text immediately below Billing codes in navigation and Home options. Do not add functionality until Melissa asks.
- Executive workspaces use a left column for itinerary/calendar/expenses and the upper-right third for Upload. Uploads recognize confirmations, receipts, statements, calendar exports, and billing-code lists from their content; preserve the existing handlers and review tools. Do not offer a document-type list.
- Travel confirmations require a trip decision before any trip or calendar changes: suggest matching open trips for the executive and ask for confirmation. If nothing matches, ask to create a named trip. Allow a manual correction or skipping without mutations. Recheck current trip data after the person responds, and preserve unrelated receipts saved during review.
- The right-hand Upload button opens file selection directly, with an always-visible drop area and no document-type choices. Ordinary supporting documents prompt for an explicit executive and trip, then save under Travel itinerary → Attachments (N/A entry by default). Unreadable or ambiguous documents must not automatically become attachments; keep them in review, and retain the travel-review path for incomplete confirmations. Receipts and statement transactions now wait for trip confirmation too; they must not silently auto-assign, including through retry actions. Offer creation of a named trip when a receipt has no likely match. Persist a new trip and its first receipt together only after explicit confirmation, and append the new trip to the executive's list. Preserve irrelevant/delete, vendor-memory, duplicate, and Review later workflows. Calendar itinerary auto-inclusion remains unchanged.

## Billing-code feature

Billing codes belongs under Workspace, directly below **Needs attention** (latest placement instruction), with a link from every executive expense report. Melissa selected a report-wide default billing code with individual expense-line overrides. Codes persist centrally; assignments are saved with reports and included in Excel and approval snapshots. Preserve existing assignment wording when codes are renamed or archived. The time-tracker request is separate and deferred.

Billing codes opens its own management page for manually adding and updating codes. Each code can be linked to multiple executives, and each executive can have multiple codes. Executive links persist centrally and appear first in that executive's expense-code dropdowns; linking a code does not automatically change an existing report's default or saved line assignments.

Billing-code uploads accept .xlsx, CSV/TSV, .docx, PDF, and text. Always show an editable review before import; automatically select valid new codes, leave existing codes unselected until explicitly chosen, and allow worksheet/column mapping. Bulk imports preserve existing executive links, add any newly selected executives, retain archived status, and never rewrite expense-report snapshots. A stale catalog rejects the entire import so no subset is silently saved.

## Reconstructed executive preferences

Create and Edit executive use the same fields for hotels, airlines, and car rentals, with multiple ranked providers. Other/custom providers retain the full questionnaire. Profiles save through the D1 executive_profiles table and retain older browser records and template assignments. Live email and calendar writes are disabled centrally in lib/workspace-mode.ts for this test release; do not enable them without explicit authorization.

## Reference-based templates

Templates support uploading screenshots or documents to detect a format and create a reviewed draft. Preserve the original reference comparison, editable text/mappings, scoped calendar formats and manual editor. Flight-only reference formats must not change hotel/car/appointment output. Saving uses the existing central template library and executive assignments; no live calendar or email sends. Do not claim pixel-perfect screenshot reconstruction: the current reader uses bundled English OCR and content patterns, with explicit review and correction.

## Portability and collaboration

Melissa requires every change to remain in the complete source repository, suitable for GitHub and handoff to other coding agents. Keep setup instructions, schema migrations, dependency lockfile and meaningful regression tests with the source. Record behavior and validation in COLLABORATION.md. Do not make a feature exist only in a preview, screenshot, deployed bundle or one agent's memory. Exclude credentials, private records, uploads and generated runtime state from source exports. Preserve the existing Sites identity and live URL; do not migrate hosting or publish to a new repository without authorization. Provide a current complete source ZIP when handing off this requested fix.

## Home document intake

Home includes the approved compact upper-left upload card. Keep its real chooser/drop handler connected to the existing import queue. Preserve explicit executive context, pending files while choosing a profile, trip confirmation before filing, and both the Home and executive-workspace entry points. Do not replace functional uploads with static design samples.

## Homepage design direction

Home uses Anya's own navy/plum/cream visual design, with a clear value statement, the real upload as the primary action, and a labeled illustrative workflow. Melissa asked for Navan's communication approach, not a copied page or visual identity. Keep Home presentation styles scoped so executive workspaces and output formats remain intact. Preserve the functional executive directory, Workspace links, optional sample loader and empty-workspace behavior.

Melissa's preferred homepage headline is “Every trip, thoughtfully organized.” with “Itineraries, calendars and expenses. One place to keep the details together.” The introduction should explain automated output creation, reusable formats and the preferences/decisions Anya remembers. Keep the learning description grounded in saved executive preferences, templates and vendor/city rules; do not imply unimplemented autonomous model training. The two example switches are illustrative only.

## Public product homepage (v52)

Melissa clarified that she wants a professional public homepage with product navigation, a hero, and dedicated feature explanations, separate from the app dashboard. ProductHome in components/product-home.tsx and scoped app/product-home.css own that experience. It describes existing confirmation-to-output automation, Outlook imports, itinerary materials, expense evidence, templates, executive preferences and remembered vendor/city rules. Illustrative previews are labeled and contain fictional records; do not replace functioning workspace controls with these examples.

The public root renders ProductHome. /test renders the existing TestWorkspace export, and valid legacy ?view= links at root continue into that workspace. Keep the preferred tagline. Keep a clear prototype-entry link at the top and a Product home return link in the test workspace. Prototype access requires no account; do not claim an account has been created, or collect signup details through a nonfunctional form. No email/calendar settings, data schemas, stored records or business workflows were changed for this presentation.

## Automation first, secondary expense learning

Melissa explicitly prioritized automation over learning. Keep existing executive/date/city trip matching and review unchanged. Never turn trip matching into a new manual learning chore. Expense learning records completed decisions in the background; optional reasons/scope and category preferences are inside the existing confirmation dialog. Confirmed category preferences may autofill categories but may not select trips, delete expenses, publish calendar changes or send messages. Manual category edits win for that draft. Inferred patterns remain explained suggestions; abstain on insufficient or conflicting evidence. Keep confirmed instructions separate from accepted/corrected/rejected evidence. Scope everything by executive, and respect trip/city limits and forgotten/paused memories. Preserve the existing explicit vendor/city trip-routing rules separately.

Read docs/expense-learning.md before extending the model. The current classifier is local and feedback-trained, without an external LLM or embedding provider. Do not advertise neural/reinforcement learning, autonomous booking or unmeasured confidence/efficiency. Migration 0013 is additive. The pre-change restore point is v52; follow docs/RESTORE_V52.md for code rollback, with no table drops or data wipes.
