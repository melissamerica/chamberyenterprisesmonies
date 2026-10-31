# Must-pass staging release test matrix

Legend: All items **UNRUN** and **NOT ACCEPTED** until complete integration with verified auth provider and deployed staging.

## Authentication and authorization
- Anonymous request -> 401 or protected unavailable; no private metadata leaked.
- Forged tenant ID/executive ID/user header -> 403; never trust client-supplied identity.
- Executive X cannot read/answer Executive Y's decision even within same company.
- EA can create only for assigned executives; admin role does not automatically grant access to confidential replies without explicit policy.
- Logged-out/revoked/deleted sessions cannot access replies or media; sessions rotate and enforce idle/absolute expiry.
- Passkeys / SSO factor and recovery processes validated per selected IdP and NIST assurance target.
- HTTPS required; secure/httponly/samesite cookies; real CSRF protection; all payloads size-limited.

## Queue and state transitions
- Every card always displays voice and video reply actions, even with no predefined choices.
- Stable option ID submitted, never raw display text for approval.
- Audio/video recording does not set approved or closed; requires review.
- Deferred and talk-soon items remain unresolved.
- Exactly-once behavior with idempotency key retry; same key used for another question -> conflict.
- Two concurrent writers with the same question version -> exactly one successful transition, other 409.
- Edited question invalidates a stale response (version mismatch).
- Cancellation/superseded question cannot be answered.
- Race during upload/response not permitted to produce orphan file or orphan response.
- Offline / flight mode -> locally labeled unsent (only if durable encrypted offline queue is actually implemented); otherwise show retry without storing sensitive content.

## Recordings and notifications
- Mobile iOS Safari / Chrome Android microphone/camera consent and denied permission state.
- Record, preview, retake, cancel, upload progress and interrupted upload.
- MIME magic validation, duration/size caps, malware scanning (where applicable), authorized private R2 storage.
- Media download requires authenticated expiring authorized access; no public object URLs.
- Notification to EA carries no confidential decision detail on lock screen by default.
- Transcription opt-in; original recording remains authoritative.
- Zoom/Teams/Meet integration not claimed until actual supported provider API/tenant permission enabled.

## Accessibility and performance
- Large touch targets, visible focus, contrast, VoiceOver/TalkBack, keyboard navigation, motion reduction.
- 320px narrow viewport, screen rotation, safe-area notches, one-hand controls.
- Duplicate taps and weak mobile network latency do not duplicate responses.
- Busy/failed/success statuses announced to assistive technology.
- No email triage, workload analytics, calendar auto-rewrite, smart scheduling links or focus blocks.

## Delegate dropdown and authority boundary (UNRUN)
- Choosing Delegate always opens a second **Select delegate** dropdown; only server-approved members appear, names alone never provide permission.
- Unlisted IDs, inactive recipients, cross-tenant memberships, or changed permissions are rejected by the server and the insert gate.
- Default delegation type is Request Input (the executive retains authority); optional transfer of decision authority must have explicit privilege and a checked confirmation.
- Assign Execution is allowed only for previously approved work; verify approval provenance in the existing EA workflow before enabling live delivery.
- Delegation creates a pending-delivery record, not a claim the delegate was notified, accepted or completed work.
- Duplicate taps and retries cannot generate duplicate delegation rows; revoked role fails closed; completed decision cannot be delegated again.
- UI shows 0, 1, 30, and duplicate-display-name delegates with accessible keyboard navigation and clear identities.
