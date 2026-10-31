# Anya: source handoff for other coding tools

## Project and source of truth

This is the complete React/TypeScript/Vinext app, not a screenshot or a static replica. All application changes belong in tracked source. The repository includes server endpoints, Cloudflare D1 schema/migrations, R2 file handlers, Word/Excel generators, UI components, dependency lockfile and tests. The original v44 foundation and subsequent reconstruction are documented in RECONSTRUCTION_SETUP.md. Read AGENTS.md before changing behavior.

The same source can be placed in a user-owned GitHub repository and edited by another coding tool. The existing Sites project remains the production deployment target. Do not create a new Site or change its audience/URL accidentally. Credentials and production data are not part of the source archive.

## Continue locally

1. Extract the complete source ZIP into an empty folder, or check out the repository.
2. Use Node.js >=22.13.0 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`.
3. Follow README.md for the portable execution profile. Do not copy another machine's ignored `.sites-runtime` directory.
4. Follow RECONSTRUCTION_SETUP.md to build and initialize a new local D1 database. Apply each SQL migration once; never replay applied migrations against existing records.
5. Run `pnpm dev`. Configure your own hosting/storage bindings for a standalone deployment; the included .openai/hosting.json identifies the existing Anya Site.
6. Keep real mail/calendar sends disabled unless Melissa explicitly authorizes enabling them. .env.example contains names only, not credentials.

For an extracted archive that is not already a Git checkout, initialize a repository in that folder, commit the included source, add the intended user-owned GitHub remote and push. For a checkout, retain its history. Do not commit production uploads, personal data, runtime databases, .env files, node_modules or generated build output.

## Relevant modules

- app/page.tsx: workspace navigation, travel import review queue, trip state and template editor.
- lib/travel-confirmations.ts: PDF/text/image reading and explicitly labeled/table-based booking parsing.
- lib/automatic-upload.ts: content recognition and workflow selection.
- components/travel-import-review.tsx: confirm existing trip or create a named trip before import.
- lib/visual-template.ts and components/visual-template-import.tsx: screenshot/document-based template drafts.
- lib/executive-profiles.ts: reusable output formats, scoped calendar rules and field interpolation.
- components/travel-output.tsx and lib/travel-exports.ts: calendar, itinerary and expense previews/exports.
- app/api, db/schema.ts and drizzle/: existing durable records and upload storage.

## Delta PDF intake fix (v48)

The original mock PDF contains outbound and return flights in parallel table columns. The reader previously flattened those columns, and the booking parser did not support this table layout. The source now preserves PDF row/column separation and parses explicit aligned flight rows. Both legs keep their own dates, airports, local times and seats. The booking confirmation is shared; the total fare is counted once. Ambiguous, incomplete or invalid required cells stay in review. Existing trip confirmation and skip behavior remain in force. No production records are repaired, deleted or replaced by this source change.

Regression fixture tests/fixtures/round-trip-flight-table.json retains PDF text positions from the actual test layout, with a fictional passenger name. The original PDF and local QA records are excluded from the repository/export.

## Verification commands

```sh
node tests/pdf-flight.cjs
node tests/travel-upload.cjs
node tests/automatic-upload.cjs
node tests/receipt-confirmation.cjs
node tests/visual-template.cjs
node tests/reconstruction.cjs
node node_modules/typescript/bin/tsc --noEmit
pnpm build
```

Executed for this fix: all six listed test suites, TypeScript, and source whitespace checks passed. Browser QA used the original mock Delta PDF in local preview: trip creation prompt, both itinerary legs, both calendar entries and one $358.40 expense were verified. No live calendar/email calls were made. Production build result is recorded by the release packaging workflow. The automated suites use isolated/fake records and do not send mail or create live calendar events. For browser QA, upload the original Delta PDF, confirm or create the intended trip, and inspect both calendar entries, the two-date itinerary and a single $358.40 airfare expense. Check a second upload offers trip review and does not duplicate identical flight entries after confirming the same trip.

## Handoff requirements for every future change

- Preserve current working workflows and saved records.
- Keep changes reviewable in ordinary source files with focused tests where appropriate.
- Update this handoff or the relevant feature note when behavior changes.
- Provide the actual published version/commit and verification limits honestly.
- Supply the full current source for an explicit handoff; never deliver only compiled bundles.

## Home upload entry point (v49)

A review of the earlier approved compact Home prototype found that the real Home page still lacked an upload target. Home now has a compact upper-left intake card with an explicit executive selector, file chooser and drop target. File-type recognition, suggested-trip confirmation, new-trip creation, receipts, calendars, billing imports and attachment review use the existing queue and dialogs. Multiple files are retained while an executive choice is pending; no blank/foreign executive selection is accepted. A queued batch waits for the chosen executive to render and pins that context per file. Fresh empty workspaces still require creating an executive, with a direct action from the upload card. Loading failures offer a retry and prevent import against incomplete saved trips. Existing executive-page uploads remain intact.

Verified: `node tests/home-upload.cjs`, `node tests/automatic-upload.cjs`, `node tests/pdf-flight.cjs`, `node tests/travel-upload.cjs`, `node tests/reconstruction.cjs`, TypeScript and whitespace checks. Public v48 was tested with the original mock Delta PDF and reached the populated trip-decision prompt; Skip left saved records unchanged. Local Home browser QA retained a PDF pending executive selection, used the chosen profile, created the itinerary, showed two calendar entries and one $358.40 airfare expense. All new QA records remain local. No live calendar or email actions were enabled.

The supplied Perplexity transcript was audited against the code: Anya / The EA’s Assistant / by Lissa branding; shared Create/Edit preference forms; chain-to-brand hotel menus; hotel/airline/car questions; Other/custom provider questionnaires; rewards fields; multiple ordered providers; and durable profile saves are present. The existing shared address is public. No redirect to a Perplexity address was implemented, and the alternative visual mockups remain previews awaiting a style decision.

## Original homepage presentation (v50)

Melissa requested Navan's approach to explaining value and prompting a first action, with Anya's own design. The Home page now leads with an original headline, the existing functional upload card, and a code-native illustrative confirmation → calendar / itinerary / expense composition. Three concise steps introduce the workflow. The executive directory and Workspace tools retain their original actions; the opt-in sample loader appears in a separate invitation below them. No signup gate, third-party imagery, testimonials or performance claims were added. The illustration is explicitly labeled as an example and does not represent saved records.

Presentation changes are limited to Home markup in app/page.tsx, components/home-workflow-preview.tsx and scoped app/home-design.css imported by app/layout.tsx. There are no changes to upload handling, trip decisions, storage, exports, executive preferences or live integration settings. Desktop and 375-pixel browser QA checked the layout, navigation and narrow-screen spacing. Home upload, automatic upload and reconstruction suites passed, as did TypeScript and whitespace checks. The release workflow runs the production build before packaging. Other pages preserve their existing appearance.

## Product introduction and preferred tagline (v51)

Restores Melissa's chosen headline, “Every trip, thoughtfully organized.”, with the supplied subtitle and workspace label. Home explains the existing automation concretely: confirmations become calendar entries, itineraries and expenses after trip confirmation; uploaded references become reviewed reusable templates; saved executive preferences and vendor/city choices carry forward.

The original workflow illustration now has two keyboard-accessible example switches: Automated creation and Learning your choices. Both show labeled illustrative content and never mutate trips, preferences or expenses. The remembered-choice example reflects existing vendor/city rules; it does not introduce model training or claim a new autonomous AI integration. Three supporting explanations replace the generic three-step strip. Home upload and all navigation remain connected to their existing handlers; there are no schema, data or live integration changes.

Validation: Home upload, automatic upload and reconstruction suites; TypeScript and whitespace checks. Desktop browser QA verifies both example states and their switches. At 375 pixels, the page has no horizontal overflow and both examples are keyboard-operable. Production build runs during release packaging.

## Separate public homepage and test workspace (v52)

The public root is now an original Anya product homepage, reflecting Melissa's clarified request for a professional sign-up-style product presentation instead of an app dashboard. It has product navigation, the preferred headline, selectable Calendar/Itinerary/Expenses previews, confirmation automation, Outlook/attachment details, expense evidence and billing, reusable templates, executive preferences, vendor/city memory, a FAQ and prototype calls to action. It does not collect signup information or pretend to create accounts. The prototype is directly accessible without registration through the top “Continue to test workspace” link.

Implementation: components/product-home.tsx with scoped app/product-home.css. app/page.tsx keeps all existing business logic in the named TestWorkspace export, adds a public entry wrapper and preserves valid root ?view= links. app/test/page.tsx exposes the same unchanged workspace at /test; relative workspace query navigation stays on that route. A Product home return link is added to the workspace status strip. No storage, import, export, profile or live-send logic was altered. The existing empty-workspace SSR regression now targets TestWorkspace explicitly; tests/product-home.cjs covers the public/workspace separation and retained query destination parsing.

Verified: TypeScript, whitespace checks, Home upload, automatic upload, reconstruction and product-home suites. Browser QA verifies public page without app sidebar, all three output-preview variants, product navigation anchors, top prototype entry, workspace Templates action, legacy root Billing codes link and Product home return. At 375 pixels, the public page has no horizontal overflow and preview controls work by keyboard. Production build is executed in the release helper before commit/package. Live calendar and email sends remain disabled.

## Secondary expense learning (v53)

Before editing, preserved the published v52 version and complete source in a separate restore ZIP, including a private snapshot of saved server trip/expense records. Restore details and limitations are in docs/RESTORE_V52.md. This private checkpoint is excluded from Git/source exports.

Adds a structured, executive-scoped expense decision history, confirmed category preferences, local feedback-trained category/non-travel suggestions, grounded explanations and pause/forget/restore controls. Normal trip matching and automation remain primary; no new mandatory questions. Optional category memory does not remember a trip assignment. Existing receipt review, vendor routing, duplicates, Review later, templates, profiles, billing and exports remain intact. See docs/expense-learning.md for exact scope, behavior and limits. Public feature copy now describes the actual expense learning behavior.

New API/storage and migration 0013 add only tables. Existing decision saves append available learning writes atomically; learning-load failure leaves normal expense processing available. No new credentials, external model service, account system, live email or calendar actions are enabled.

Verification: all existing PDF, trip import, screenshot template, receipt, Home upload, automatic upload, reconstruction and public entry suites passed. The new expense-learning suite and TypeScript/whitespace checks passed. Chronological synthetic evaluation is documented in docs/expense-learning-evaluation.json without production performance claims. Browser QA through real local uploads verified three corrections → explained suggestion → explicit category preference → automatic category fill on the next receipt, with existing Denver trip matching still shown. Forget/restore and 375-pixel layout were verified. Production build is executed by the release workflow. Demo records remain local; only fictional CSVs/instructions are packaged in the optional demo download.
