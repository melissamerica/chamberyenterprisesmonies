# Anya / ExecOS — Executive Mobile Decision Queue (STAGING ONLY)

**Status: design and code review artifact. NOT INTEGRATED, NOT DEPLOYED, NOT PRODUCTION READY.**

Derived from source archive `Anya_Complete_Source_v53.zip`. The current Anya test workspace uses Next.js 16 / vinext / React 19 / Cloudflare D1 and R2. A ChatGPT host-header identity helper exists, but the supplied upload/profile API routes do not establish enforceable tenant/executive role authorization. It is NOT safe to open executive decision endpoints until a trusted organization identity provider and membership mapping are installed.

This package contains: mobile decision component, proposed normalized types, basic request validation, fail-closed identity boundary, role-scoped database queries, response API contract, additive schema, red-team tests, and an independent **fictional local preview**. It intentionally DOES NOT contain fake passkeys, fabricated encryption keys, or a connected live Zoom/Teams integration.

## Integration order / gates
1. Confirm executives' authentication provider (Microsoft Entra ID / Google Workspace / independent passkeys), tenant and role model. Implement and test `requireExecutivePrincipal()` via a trusted server-side verified provider, not browser-provided IDs or email headers. The stub throws on purpose.
2. Decide single-app vs multiple customer companies; define memberships (executive, EA/Chief of Staff, delegated backup, admin). Every query must be tenant-scoped and owner-scoped. EA creation routes must separately authorize assigned executive access.
3. Review migration, integrate into existing Drizzle/D1 journal rather than manually running a parallel migration system, connect existing R2 private storage, and add durable audit/error reporting.
4. Implement original media upload/recording using secure context, permission handling, type/content validation, size/duration caps, private R2 keys, short-lived authenticated views, retention and deletion policy.
5. Confirm notification opt-in, delivery methods, provider agreements and meeting provider (Zoom/Teams/Google Meet). No notifications or calls are sent by staged code.
6. Implement/review rate limits, CSRF/origin, CSP, same-site cookies, session timeout/rotation, encryption-in-transit and at-rest. Any field-level AES-GCM requires separate managed keys, rotation, backup, and migration plan; do not claim full end-to-end encryption.
7. Only then adapt routes and UI inside existing Anya source, run typecheck/integration/security tests against staging, review, and request explicit approval before deployment.

## Product guards
- Micro-decision, not a messy email inbox. One concise question per screen.
- ALWAYS show `Send voice reply` and `Send video reply` in the Answer menu, for EVERY question.
- Audio/video are response media, NOT approval or final disposition. Outcome remains `awaiting_ea_review` unless explicitly confirmed.
- Executive can answer with stable option IDs, typed reply, request information, defer, talk soon, or delegate where permitted.
- No autonomous calendar reshuffling, algorithmic scheduling links, focus protection, or workload dashboard.
- Defer and talk soon are explicitly unresolved obligations; available scheduling occurs through human-approved calendar workflows.
- Never silently publish, book, send, change schedules, or interpret a recording as approval.
- Strict `expectedVersion` conditional transition and idempotency key on every submission.
- Mobile controls min ~44px and responsive to compact screens; safe area and screen reader status.

## Preview
Open `preview/Anya_Executive_Decision_Queue_Mobile_Preview.html` in a browser. It uses fictional data and only simulates responses in the browser memory. **The preview's unlock button is NOT authentication and is not encryption. No information is sent to a server.**

## Code organization
- `src/contracts/decision.ts` — shared response and decision contracts.
- `src/server/auth.ts` — mandatory fail-closed authentication boundary.
- `src/server/decision-store.ts` — role/tenant scoped D1 read and conditional write model.
- `src/app/api/exec/decisions/route.ts` — authenticated list endpoint.
- `src/app/api/exec/decisions/[id]/respond/route.ts` — authenticated answer endpoint.
- `src/components/ExecutiveDecisionQueue.tsx` + CSS — executive mobile queue / answer menu.
- `db/0014_execos_decisions_PROPOSED.sql` — conceptual additive migration; requires reviewed integration into existing journal.
- `tests/security-and-functional-matrix.md` — pass/fail cases.

## Sources and standards reviewed
- NIST SP 800-63B-4: https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP Authorization: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP File Upload: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

## Added: nested Delegate dropdown
The response-menu `Delegate` item opens a second **Select Delegate** dropdown backed by the tenant/exec-scoped `GET /api/exec/delegates` endpoint. Only explicit authorized delegate grants are returned. A third control selects the authority mode: Request Input (default), Delegate Decision (explicit limited authority), or Assign Execution (approved work), with instructions, optional due date and confirmation for authority transfer. The store writes a `pending_delivery` row, not a delivery/acceptance claim. The actual authenticated delegate messaging/inbox/acknowledgement workflow remains a separate required integration. The UI and handlers fail closed until verified IdP is configured.

## Code review correction: pending-only queue
The executive GET returns only `pending` decisions. After a response, review/deferred/delegation states are not answerable until an authorized Chief of Staff action explicitly reopens the card with a new version. A deferred reappearance scheduler is future work and must not be claimed live.

## Updated safety review
Assign Execution is intentionally blocked server-side until a prior approved-action record can be verified. A checkbox is not sufficient evidence. See STAGING_REVIEW_REPORT.md.
