# Travel Desk — ExecOS mini-tool (isolated prototype)

A compact travel/expense workflow extracted from Anya source. The app runs in the browser using Anya's existing document parsing, PDF/image/OCR readers, Word itinerary builder and Excel workbook builder. It does not connect to email, calendars, billing systems, approval routing or enterprise accounts.

## Run locally

From the repository root, install existing dependencies with the project's standard package manager, then:

    npx vite --config mini-tools/travel-expense/vite.config.ts

Build as a standalone static application:

    npx vite build --config mini-tools/travel-expense/vite.config.ts

Output: dist/travel-expense/ (ignored by Git). Serve the output at a site root. The PDF and OCR worker assets use absolute paths inherited from Anya's reader.

Tests:

    npx vitest run --config mini-tools/travel-expense/vitest.config.ts
    npx tsc --noEmit -p mini-tools/travel-expense/tsconfig.json

## Workflow

1. Drop or select **one** travel confirmation or receipt (PDF, image, text, or supported imported file).
2. The reused Anya document classifier suggests travel or expense intake. Incomplete and ambiguous files are **not** imported.
3. Review the extracted entries and explicitly select an existing trip or create a new trip. Possible duplicates require explicit acknowledgement.
4. Preview and download a true Word (.docx) itinerary and Excel (.xlsx) expense workbook. Unavailable amounts are marked missing and excluded from known totals.

Manual expense input handles unreadable receipts. A fictional sample trip is loaded only on request. Reviewed records are retained in this browser's localStorage (no cloud sync); original file bytes are **not** saved. Do not enter sensitive real records on a public/shared device. No accounts, server writes, live sends, or AI service keys are used.

## Source reuse and boundaries

- src/lib/automatic-upload.ts — Anya's file classification/reading
- src/lib/travel-confirmations.ts — booking parser, multi-leg flights and OCR/PDF reader
- src/lib/workspace-uploads.ts — receipt/transaction extraction
- src/lib/executive-profiles.ts — itinerary and expense preview data/default output formats
- src/lib/travel-exports.ts — actual Word/Excel generation
- core.ts — small mini-tool adapter, duplicate-warning logic, safe known-amount totals

The app imports these exact source modules through Vite's alias. It does **not** modify or bypass Anya's existing workspace or production paths. It is standalone at runtime, but its **source build** still depends on this repository and its existing assets/dependencies. If moved to another repository, these shared modules and assets must be extracted with it.

## Explicit limitations

- Synthetic sample only; does not prove universal vendor/PDF extraction. OCR depends on readability.
- Review edits support text, labels, amounts and expense categories. Incorrect parsed travel instants require a corrected input; the app does not guess flight time zones.
- Credit-card statement reconciliation, calendar downloads, custom templates, approval/signatures, billing codes, long-term file attachments and integrations are postponed.
- Duplicate detection is a warning, not a guarantee; user reviews each import.
- Browser-local records are not durable organization storage. No deployment or merge is authorized by this branch.
