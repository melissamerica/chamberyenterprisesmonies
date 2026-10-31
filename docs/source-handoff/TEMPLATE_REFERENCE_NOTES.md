# Templates from a visual reference

Templates → Create from a reference opens a browser-local upload reader. The existing custom-template editor, central library, executive assignments and exports remain in place.

## Supported behavior

- PNG/JPG/WebP/GIF screenshots, PDF, Word, Excel, CSV/TSV and text references; one reference at a time, under 20 MB.
- Reads screenshots with the existing bundled English OCR. Documents use the existing PDF/Office readers.
- Recognizes calendar entries, travel itineraries and expense reports from their readable contents. An unclear reference asks for a format correction rather than silently choosing one.
- Shows the original image or extracted document text alongside editable recognized fields. Correct extracted text is available for OCR errors.
- Calendar subjects, locations and notes become reusable formats. Flight number, route, departure/arrival, seat and confirmation values are mapped when recognized; additional values can be mapped manually or kept fixed.
- Supports compact, spaced, upper/lowercase and 24-hour departure/arrival tokens. Start/end instants always remain confirmation data; screenshots cannot hard-code the event dates/times.
- Detects visible Show As and reminder settings. Unseen settings retain current values.
- Flight/hotel/car/appointment-specific calendar formats preserve the general calendar format and other entry types. Choosing all entries explicitly replaces scoped calendar formats.
- Use this draft changes only the in-progress editor. Existing Save custom template performs the durable save; executive assignments use the existing controls.
- The screenshot itself is not retained or sent to an external AI service. Saved template JSON contains only the reviewed formats and settings.

## Limits

This is OCR and content-pattern recognition, not a general multimodal model or a pixel-perfect design converter. Fonts, colors, Outlook window chrome, rich text, embedded images, arbitrary spreadsheet formulas and unsupported columns are not reconstructed. Outlook controls its own rendering. Itinerary/expense references use the app's supported Word/list/table and Excel options. Review extracted fields and unmapped values before saving. English OCR can miss small, cropped or low-contrast text. Dates in textual formats use the existing booking date representation. Separate same-valued examples may need direct template editing after applying the draft.

## Verification

- `node tests/visual-template.cjs`: type detection, literal-to-token conversion, punctuation/blank lines, changed booking values, scoped formats, legacy fallback, clock styles, JSON round-trip, editing/reset, invalid format rejection, classic Outlook body, replacement boundaries.
- Browser: actual PNG screenshot OCR recognized the exact example subject `DL1358; TLH-ATL; 8:09pm/10pm; 2C; CJT8JH`, all seven changing values, body, location, Busy and 30-minute reminder. Applied, saved, refreshed and reopened through the real local D1 API. A different flight used its own values; a car booking kept the original format and 15-minute reminder.
- Existing reconstruction, automatic upload, travel confirmation and receipt confirmation suites passed; TypeScript passed. No live email/calendar actions enabled or exercised.
- Test fixtures and saved QA templates stayed in local preview storage and are excluded from deployment.
