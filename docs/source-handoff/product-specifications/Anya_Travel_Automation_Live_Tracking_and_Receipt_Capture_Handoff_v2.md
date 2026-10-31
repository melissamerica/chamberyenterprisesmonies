# Anya — Unified Travel Automation, Executive Receipt Capture + Live Flight Tracking

**Status:** Implementation handoff for later integration. **Not deployed, connected, or tested as a live integration.**
**Source inspected:** `Anya_Complete_Source_v53.zip` (latest available archive inspected October 29, 2026). Confirm the deployed/live code version before editing.
**Scope:** Build all THREE features as ONE coordinated, later-integration package within the existing Anya application: (A) Outlook/Gmail travel-confirmation ingestion, (B) EA-homepage live flight tracking, and (C) executive receipt-photo capture with automatic trip assignment. Keep Smart Drop, trip workspaces, UI branding, navigation, authentication, and other functionality intact.

## Product goal

The EA connects an authorized Outlook or Gmail mailbox. When an incoming email contains a flight, hotel, car-rental, or other supported travel confirmation, Anya automatically recognizes its content and/or attachments, creates a draft intake candidate, determines the executive, and matches the existing trip or proposes a new trip. An authenticated executive can also **photograph a receipt from a mobile phone within Anya**; Anya extracts receipt details and automatically associates it with the correct existing trip when the evidence is unambiguous, creating a draft expense/receipt entry for EA review. When a confirmed flight becomes airborne, the EA homepage's **Where in the World Is…** compact right-side rail shows the aircraft's latest licensed live-reported position on an interactive map. Clicking the traveler expands the map or opens the trip. **Automatically prepare, never automatically publish, send, spend, reimburse, or overwrite consequential changes without the EA's approval.**

## Verified source baseline

- App: Next.js 16.3.4, React 19.2.6, Vinext/Cloudflare Workers; D1 with Drizzle, R2 bucket.
- Public product homepage and EA workspace are distinct: public `/` vs EA workspace `/test` and supported workspace navigation. Place the tracking rail on the **EA workspace homepage**, not on the public product marketing homepage.
- Existing parser and classifier: `lib/travel-confirmations.ts` (`parseLabeledConfirmation`, `readTravelDocument`), `lib/automatic-upload.ts` (`classifyUploadText`, `recognizeUpload`).
- Existing trip matching: `lib/travel-trip-matching.ts` (`matchingTravelTrips`).
- Existing saved trips and uploaded objects: `lib/upload-storage.ts`, `app/api/uploads/route.ts`, `db/schema.ts`, D1 and R2.
- Receipt photographs need a **mobile-accessible executive capture flow** with permissions derived from the logged-in executive and reuse of Anya's existing expenses/attachment models after inspection. Do not assume the standalone executive communications preview implements authenticated mobile receipt upload.
- Current manual import orchestration lives mainly in the **client-side** `app/page.tsx`; `readTravelDocument` uses browser PDF.js and document/canvas APIs for PDF/image OCR. **Do not simply call browser-only import code in a Cloudflare Worker**. Refactor the reusable parsing, normalization, matching, and candidate state to environment-compatible shared modules and separately handle server-side email MIME / attachments; scanned PDF/images require a compatible extraction solution or a review fallback.
- `Anya_World_Travel_Rail_Preview.html` is a standalone design preview with fictional data, not a working tracking widget. It is a UI reference, not proof of live integration.

## Functional requirements

### A. Mailbox connection and recognition

1. Anya Settings > Email Connections: independent Microsoft 365/Outlook and Google/Gmail OAuth account connections, connection health, pause/reconnect/disconnect; user explicitly authorizes each mailbox. Support a dedicated travel mailbox/folder/label as an optional privacy-forward configuration, while optionally classifying new Inbox mail when authorized.
2. Outlook: Microsoft Graph change notification webhooks (with subscription renewal and missed-event reconciliation using delta query). Gmail: Gmail `users.watch` notifications through Google Cloud Pub/Sub, then `history.list`; renew Gmail watch before expiry. Use backoff/retries, token refresh/revocation handling and stale cursor recovery.
3. Message fetch/parse: obtain only the content needed for travel classification; inspect sender, subject, body (plain/HTML), MIME tree, PDF/ICS/HTML/email attachments, booking dates, traveler name, flight numbers, origin/destination, confirmation references. Messages can contain reservations directly in the HTML body—do **not** require attached PDFs. Parse forwarded threads, quoted history, and multiple legs appropriately.
4. Classify: true new booking vs marketing/promotions/advertising, receipt vs booking, itinerary amendment, cancellation, confirmation reminder, duplicate, unclear/unassigned. Unsupported/ambiguous input goes to review, never dropped silently.
5. Executive resolution: match connected mailbox/account, traveler names and saved executive aliases, reservation details and optional sender association. **Do not equate the EA mailbox owner with the traveler.** Store evidence and confidence. Resolve ambiguous travelers through EA review; do not attach to the wrong person.
6. Trip resolution: reuse `matchingTravelTrips` with strengthened reference, dates, executive ID and city/route logic. Propose "This appears to belong to Alex's Denver trip" or "Create a new trip?". Only high-confidence, unambiguous candidates can be auto-staged to the correct *draft* trip; otherwise place in Needs Attention.
7. Automation: prepare itinerary and calendar draft contents, flight tracking linkage, supporting confirmation source, and expense evidence candidates under existing workflow rules; **do not auto-publish calendars, auto-send to executives, or auto-create charges**. Notify EA of edits, cancellations, diversions and conflicts; preserve original details with provenance.
8. Duplicate/updates: idempotency on provider account + immutable message ID; booking/segment fingerprint based on executive, confirmation/reference, operating flight, departure date and route; distinguish resends vs revisions. Reconcile competing confirmations and original-versus-updated values. Include version history, manual corrections and reversal/retry safely.
9. Privacy/security: least-privilege mailbox read scopes; encrypt OAuth refresh tokens and private confirmation records in storage; verify webhook/Pub/Sub origins and signatures/configuration; normalize/sanitize HTML and attachment content; enforce file size, MIME, malware and decompression limits; isolate per-user/workspace accounts; user-visible audit logs, retention controls and disconnected-account behavior. No mailbox processing before consent. Limit data sent to external classifiers and never use email body as executable instructions.

### B. Where in the World Is… live flight tracking

1. Keep approved compact, right-hand EA-homepage rail, not executive portal or product marketing homepage.
2. Show all traveling executives based on authorized itineraries; airborne flights get live aircraft map; others show itinerary-derived trip/destination status (never imply individual GPS tracking).
3. Provider abstraction: FlightAware Integrated Maps for a licensed embed or a live positions API (FlightAware AeroAPI, Flightradar24 API, or another licensed provider) + own map. Negotiate correct B2B licensing and map re-display rights before commercial release.
4. Match to **specific operating flight instance** via airline, operating flight number, origin/destination, departure date/time, and unique provider flight ID; handle codeshares, connection legs, midnight/UTC transitions, reschedules, cancellations, diversions and aircraft swaps.
5. Display last **reported** aircraft coordinates, route, flight status, ETA, and timestamp; if stale/no data, show unavailable/last reported, not false live state. Poll at provider-supported interval (candidate ~60 seconds during flight, tune per license and limits); cache per flight, not per EA viewer.
6. Show multiple executives and permit expanded interactive view; record no device GPS, and protect travel data with existing app authentication/authorization.
7. On landing, update destination status, but retain recent flight status for audit/review as configured.

### C. Executive receipt photography and automatic trip matching

**Primary experience:** In the authenticated executive-facing view, the executive taps **Snap Receipt** (or **Add Receipt**), takes a photo with the phone's camera or chooses an existing photo, and submits it. Anya does the organization work automatically. This is **in addition to**, not a replacement for, receipts forwarded from email or manually added by the EA.

1. **Capture:** Provide a clear mobile-friendly camera/upload control in the executive interface; use browser camera capture when supported (`accept="image/*"` and, as an enhancement, `capture="environment"`), with a photo-library/file fallback. Offer retake, preview, and clear upload/sync confirmation. Don't require a dedicated native mobile application for initial rollout.
2. **Secure intake:** Associate the uploaded receipt with the authenticated executive server-side, not with a name guessed from photo content. Validate file type/size, sanitize filenames, protect R2 objects, and enforce executive-to-trip permissions. Avoid exposing original receipt images at public URLs. Strip or minimize unnecessary photo metadata where practical.
3. **Receipt recognition:** Extract merchant, transaction date/time (including timezone if available), amount, tax, tip, currency, location, receipt number and payment hints using OCR/document extraction compatible with the deployed Cloudflare runtime. Store extracted values and confidence alongside the image; support manual correction. Never assume unsupported OCR works merely because browser-based PDF recognition exists.
4. **Automatic trip assignment:** Prefer the executive's **own** active or recently completed trip. Score candidate trips using traveler/executive ID, expense date within trip dates (allow configurable travel-day/grace windows), destination/merchant location, known booked vendors, relevant itinerary stops, and context. Handle timezone differences, overnight flights, multiple trips, remote purchases, ambiguous merchants and post-trip receipts. **When there is one high-confidence match, attach the receipt to that trip automatically** and create/update a *draft* expense entry; notify the EA without requiring a manual trip selection.
5. **Ambiguous or unmatched cases:** If two trips are plausible, or no trip matches, hold the image in a secure unassigned receipt queue, suggest likely trips, and ask the executive or EA to confirm. Never silently place the receipt on the wrong trip. Preserve user corrections to improve later matching **only with an explicit, scoped rule**; do not claim autonomous learning until implemented and tested.
6. **EA expense workflow:** The receipt appears under the matching trip's receipts/expenses and can surface in **Needs Attention** when fields, category, billing code, amount, or trip assignment require review. Preserve Anya's existing approval, expense export, finalization and billing-code workflows. Photographing a receipt does **not** automatically charge a card, submit reimbursement, modify accounting, or finalize an expense report.
7. **Duplicates and revisions:** Detect repeated camera uploads and duplicates from Gmail/Outlook or Smart Drop using file hashes plus normalized merchant/date/amount/receipt-number fingerprints (with tolerance for cropped/resized photos). Keep provenance, version history and original image; give the EA a safe merge/keep-separate choice when uncertain.
8. **Sync and failure states:** Be explicit about upload processing versus completed trip assignment. Show **Uploaded · Processing**, **Filed under [trip]**, or **Needs trip confirmation**. On intermittent connectivity, retry with an idempotency key and avoid duplicates; only promise offline capture/queueing if a real persistent offline queue is implemented.
9. **Access and retention:** Executives can access only their own permitted trip receipts; their assigned EA(s) can access receipts according to existing role rules. Use existing audit, retention and deletion policies; redact sensitive payment information where possible. Any external OCR provider requires an approved data-processing and privacy arrangement.
10. **Integration priority:** This capture workflow must share Anya's receipt/expense and trip-matching services with the mailbox-ingestion and Smart Drop pipelines. Do not create an isolated executive receipt store or a second source of truth.

**Representative behavior:** Alex takes a picture of a Denver taxi receipt while traveling. Anya reads the date, vendor and amount, recognizes Alex's Denver trip, saves the image to that trip, and drafts an expense. If Alex has two overlapping trips, Anya asks which one rather than guessing.

## Proposed internal contracts (to adapt to actual source)

```ts
export type IntakeSource = 'manual_upload' | 'gmail' | 'outlook' | 'executive_receipt_camera';
export type IntakeCandidate = {
  id: string;
  source: IntakeSource;
  mailboxConnectionId?: string;
  providerMessageId?: string;
  receivedAt: string;
  sourceDocumentIds: string[];
  inferredKind: 'flight' | 'hotel' | 'car' | 'rail' | 'other' | 'review';
  classification: 'new' | 'revision' | 'cancellation' | 'duplicate' | 'unclear';
  parsedSegments: unknown[];
  executiveId?: string;
  proposedTripId?: string;
  confidence: 'high' | 'medium' | 'low';
  reviewState: 'staged' | 'needs_attention' | 'approved' | 'dismissed';
  version: number;
};

export interface MailSourceAdapter {
  subscribe(connectionId: string): Promise<void>;
  renew(connectionId: string): Promise<void>;
  fetchChanges(connectionId: string, cursor?: string): Promise<unknown[]>;
  normalizeMessage(message: unknown): Promise<NormalizedEmail>;
}

export type ReceiptIntakeCandidate = {
  id: string;
  source: 'executive_receipt_camera' | 'manual_upload' | 'gmail' | 'outlook';
  executiveId: string;           // Verified from auth context for camera uploads
  receiptObjectId: string;       // Private stored original, not a public URL
  captureIdempotencyKey: string;
  recognized: {
    merchant?: string;
    occurredAt?: string;
    amount?: number;
    currency?: string;
    location?: string;
    receiptNumber?: string;
  };
  proposedTripId?: string;
  tripMatchConfidence: 'high' | 'medium' | 'low';
  filingState: 'processing' | 'auto_filed_draft' | 'needs_trip_review';
  draftExpenseId?: string;
};

export interface ReceiptTripMatcher {
  proposeTrips(receipt: ReceiptIntakeCandidate): Promise<
    Array<{ tripId: string; score: number; evidence: string[] }>
  >;
}

export interface FlightPositionProvider {
  resolveFlight(flightLeg: FlightLegDescriptor): Promise<ResolvedFlight | null>;
  getStatus(flight: ResolvedFlight): Promise<FlightStatus>;
  getTrack(flight: ResolvedFlight): Promise<FlightTrack | null>;
}
```

These contracts are **illustrative**; preserve actual `UploadTrip`/`TravelEntry` types and follow `AGENTS.md`. Avoid inventing a second trip source of truth.

### Suggested additions, adapt after source audit

- `lib/mail-connectors/{microsoft,google}.ts` plus common adapter/auth, webhook renewal, token store and job queue.
- `lib/intake/{normalize-email,parse-candidate,resolve-executive,versioning}.ts` shared with manual-upload import.
- `lib/receipts/{recognize-receipt,match-receipt-trip,dedupe-receipt}.ts` to reuse existing trips, uploads, attachments and expense drafts; worker-compatible image extraction adapter.
- `components/executive-receipt-capture.tsx` in the authenticated executive view, plus EA Needs Attention and trip receipts integration.
- `lib/flight-tracking/{provider,flightaware}.ts` plus normalization/cache.
- `components/where-in-world-rail.tsx` and `components/flight-detail-map.tsx` in EA workspace.
- Protected API callbacks: `/api/email-connections/*`, `/api/mail-webhooks/outlook`, `/api/mail-webhooks/gmail`, `/api/intake-candidates/*`, `/api/travel-status/*`, plus an authenticated `POST /api/receipts/capture`, `GET /api/receipts/:id/status`, and trip-confirmation endpoint (adapt route names to existing source).
- D1 migrations for `mail_connections`, `mail_sync_cursors`, `mail_events`, `intake_candidates`, `booking_segments`, `booking_revisions`, `tracked_flights`, `flight_position_cache`, `intake_audit_events`—scoped by authenticated workspace/tenant and executive; unique/idempotency indices; R2 keys for authorized document artifacts.
- Extend existing receipt/expense tables where possible; otherwise add `receipt_intake_candidates`, `receipt_trip_matches`, `receipt_dedupe_fingerprints` and audit links. Keep an immutable source-photo R2 reference and a nullable approved trip assignment. Do not create parallel expenses where the existing schema suffices.
- Background jobs/Cloudflare Cron for renewals, reconciliation, position refresh and cleanup. Confirm runtime binding and Cloudflare support before choosing queue infrastructure.

## Security/approvals/licensing realities

- Microsoft Graph mail body/attachment reading typically needs delegated `Mail.Read` for the signed-in user's mailbox. Shared/delegated mailbox *change notifications* have different restrictions; organization-admin-approved application permissions may be necessary. Do not assume every EA can watch an executive's private mailbox.
- Gmail API's `gmail.readonly` is a **restricted** scope; commercialization can require OAuth verification, and server-side access/storage may trigger a third-party security assessment (with exemptions for qualifying testing/internal use). Compliance is a release dependency. Anya must create its **own** OAuth connection; a Gmail app connected to ChatGPT is not automatically usable by Anya.
- Flight trackers can provide delayed/partially absent aircraft positions. Commercial embedding/API redistribution rights and costs must be validated.
- Offer a forward-to-Anya travel email alternative for cases where company IT does not permit mailbox monitoring; secure inbound email verification and tenant scoping are still necessary.
- Executive receipt images can contain payment details and sensitive purchase information: require role-based access, private storage, short-lived signed viewing, redaction as appropriate, and clearly scoped OCR processing. Do not infer personal location tracking from a receipt; merchant location is only matching evidence.

## Release order

1. Before touching production, compare the new live-code baseline against v53, take a source/database restore point, and test existing Smart Drop import regression cases.
2. Extract shared draft travel-intake service from browser-only process; implement normalized input from both manual file and email; test existing examples remain unchanged.
3. Implement Outlook and Gmail authorization and change feeds, reconciliation, parsing and staging. Start with synthetic test inboxes and no real user mailbox access.
4. Connect staged incoming confirmations to Needs Attention, trip proposals and EA preview. Test multiple travelers/legs, amended and canceled bookings, forwarded emails, duplicates and unrelated email.
5. Add executive photo capture, securely normalize/upload image, parse receipt, and automatically associate high-confidence receipts with an existing trip as *draft expenses*; give the EA a review queue for uncertain matches. Reuse original expense/billing-code flows.
6. Implement tracking provider adapter, confirmed-flight matching, position cache and map components. Test staging with simulated positions and clearly labeled non-live states.
7. Enable all three behind independent feature flags, validate privacy/consent/licensing, run regression/end-to-end tests, then deploy deliberately after approval.

## Acceptance tests

- New Outlook flight confirmation (body-only) creates exactly one draft candidate and the right trip proposal.
- Gmail PDF confirmation and equivalent manually dropped PDF use the same normalized itinerary fields and trip matcher.
- Two different passengers forwarded in one EA mailbox do not get assigned to the mailbox owner.
- Multiple-leg itinerary creates distinct flight legs and tracking links.
- Outlook/Gmail duplicate push events and email forwards do not create duplicate trips.
- Revised departure, cancellation and booking change are detected and shown for EA review.
- Hotel emails integrate without causing false aircraft tracking.
- Email without travel content is ignored or retained as appropriate, with no unrelated private body leakage.
- Scanned/unparseable PDF is flagged as unreadable, never misrepresented as recognized.
- Mailbox disconnect/revocation stops ingestion and removes/invalidates the subscription.
- Live map reflects the last provider position **with timestamp**, not GPS or fabricated travel data.
- Provider downtime and missing positions show a graceful fallback.
- Unauthorized users cannot read executives' trips or mail content from other workspaces.
- Existing public homepage, EA workspace, Smart Drop, trips, calendars, expenses, and Decision Queue components retain their behavior.
- Executive takes a photo of a Denver trip receipt; within the executive's permitted trip scope, a single high-confidence match attaches the image and creates a *draft* expense without manual trip selection.
- Overlapping trips, unknown traveler, mismatched receipt dates and weak OCR trigger trip confirmation/Needs Attention without incorrect auto-filing.
- Executive can preview, retake, and submit a receipt on a mobile browser; rejected image types and upload failures are reported explicitly.
- Duplicate receipt photos, resized/cropped duplicates and an email copy of the same receipt don't create duplicate expense drafts.
- OCR failure saves the source image and routes it for manual expense-entry review rather than dropping it.
- An executive cannot attach or retrieve another executive's receipt by changing a trip ID in the request.
- Anya does not send reimbursements or approve expense reports merely because an executive snapped a receipt.

## Decisions outstanding

- Which mailbox to support first: Outlook, Gmail, or both simultaneously?
- Which sources may Anya monitor: EA's connected inbox only, a dedicated mailbox/folder, and/or specific executive/shared mailboxes when authorized?
- Whether high-confidence candidates may be auto-staged directly into draft trips with a notification, or all should require an explicit EA click before staging. Recommended: stage draft automatically; review before publication or substantive revisions.
- Commercial vs internal deployment affects Gmail scope verification and flight API license.
- Commercial only vs charter/private aircraft tracking affects provider coverage and privacy/availability.
- Confirm whether executives should see/edit a proposed trip match before submission or only be prompted when Anya is uncertain. **Recommended:** auto-file high-confidence matches and allow correction afterward.
- Confirm whether executives may capture personal/non-trip receipts for later review. **Recommended:** unassigned/private-workspace receipt intake with explicit disposition, not forced travel assignment.
