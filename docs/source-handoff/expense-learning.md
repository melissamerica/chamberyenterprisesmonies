# Expense learning: automation first

This release implements the first expense-learning vertical slice. Existing confirmation, receipt date/city matching, trip review, duplicate handling, Review later, templates, billing, Word/Excel exports and live-send guards remain authoritative. Learning never selects or writes a trip, purchases travel or sends anything.

## Working behavior

- Successful assignment/non-travel decisions can record structured, executive-scoped evidence with previous/final category, action, outcome, reason/scope, source file/row/trip and a server timestamp. Accepted, corrected and rejected suggestions are distinguished. Review later and no response are not acceptance.
- Confirmed category preferences are separate from observations. Optional feedback can restrict a preference to this trip, vendor+city, or the executive's vendor across cities. A confirmed preference fills the category automatically; a manual category edit takes precedence for the current draft.
- A small local nearest-neighbour model retrieves comparable prior merchant/city decisions, ranks them by merchant similarity and recency, and votes on the final category/non-travel outcome. Numeric merchant brands are preserved; varying trailing terminal references after multi-word merchants can match. It requires three distinct transactions and consistent support. Weak, conflicting, unknown-city, cross-executive, one-trip-only, duplicate, same-transaction and future evidence is excluded or abstained from. Inferred patterns remain suggestions.
- Explanations cite the exact stored preference or prior decisions used. Imported document text is data, not instructions. No chatbot prompt or outside API is used to perform expense actions.
- Anya memory is a collapsed disclosure inside the existing expense-upload review. It supports pausing inference/background collection and forgetting/restoring confirmed preferences or evidence. Existing explicit preferences still work while learning is paused. Recent retrieval is bounded to 500 decisions and 200 preferences per executive; the UI shows the latest 30 decisions.
- Teaching is optional in the existing confirmation dialog. Category memory and the existing vendor/city trip-routing rule are separate. The regular file import flow is not held while memory loads. A memory-read failure falls back to the normal expense save and reports that feedback could not be recorded. When available, expense and evidence writes share an atomic D1 batch. No migration creates sample data or backfills bookings into implied preferences.

## Modules and storage

lib/expense-learning.ts: pure model, memory types, feedback validation and evidence construction.
lib/expense-learning-storage.ts: executive-filtered D1 retrieval and prepared writes.
app/api/expense-learning/route.ts: bounded memory/settings API within the existing shared test-workspace access model.
components/expense-learning.tsx: nonblocking loading, explanations, optional feedback and memory inspection.
components/executive-upload.tsx: confirmed category autofill, manual-edit protection and optional feedback integration.
app/api/uploads/decisions/route.ts and lib/upload-storage.ts: join evidence writes to existing expense decisions.

Migration 0013_expense_learning adds three tables; it does not alter or delete existing data. Apply it once locally using the README command; Sites applies it during publication. v52 can ignore these extra tables during a code rollback.

## Evaluation and verification

node tests/expense-learning.cjs exercises actual D1-style persistence and API handlers plus scope, conflict, duplicate, chronology, forget/restore, deferred decisions, immutable retry handling, expense/evidence rollback and memory-unavailable fallback.
node tests/evaluate-expense-learning.cjs runs a chronological fictional holdout against a most-recent-category-per-executive/city baseline. The checked-in JSON report is a reproducible regression fixture, not a production accuracy, confidence or efficiency estimate.

Browser QA teaches three fictional Verve Mobility receipts, verifies an explained suggestion for the fourth, saves a category preference and verifies automatic fill for a fifth. Forget/restore controls were exercised. At 375 pixels the dialog fits and the category remains filled. QA records stay local and are excluded from the source export. The optional public demo ZIP contains fictional CSVs and instructions only.

## Boundaries and next stages

This is a local feedback-trained category classifier with structured memory and retrieval. It is not a connected language model, semantic embedding service, reinforcement-learning system, hotel recommendation engine or autonomous booking agent. Client/purpose/distance/policy features, natural-language preference interpretation and broader itinerary learning have not been implemented. Add those only as concrete, tested extensions of this first slice. Live calendar and email sends remain disabled. There is no user-authentication redesign: the app retains its existing public/shared prototype access.
