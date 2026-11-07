# Travel Desk design source and validation

## Source audit (November 6, 2026)

Fetched GitHub refs from `melissamerica/chamberyenterprisesmonies` before editing:

- `main`: `35503a709688665dc9d4aeb51b2588e75e8e724b`. Contains `src/features/exec-mobile/{ExecHome.tsx,exec-mobile.css,themes.ts}`; this version is the **older matte** Granite & Midnight Crimson home, without the approved champagne ribbon treatment.
- `feature/execos-mobile-v1`: `55f29670e04636c3fe0706ccb9c36cd89fa3c921`. Predates that home implementation.
- `demo/execos-mobile-nov-2026`: `525d68b827733bdf6d5aadc8a1fe993181836889`. Its `public/interview-demo/index.html` implements a different split handset/My Work demo; it is not the champagne ribbon source.
- Travel branch started at `e20ba277dd4d3c09c80dea66fd89f346e415f29a` (existing draft PR #5). Its prior dark stylesheet incorrectly attributed itself to the current approved design.

The newer selected design exists in the user's **uncommitted local `execos-ticker` checkout**, based on `35503a7`, at `execos-mobile/src/features/exec-mobile/`. It is not a published GitHub branch or commit. Do not claim otherwise. This pass reads that implementation without changing it, and applies only its presentation to the travel mini-tool.

Source fingerprints (SHA-256):

- `exec-mobile.css`: `949ACE3C48FDEE0EA3F1D4A500598FFD070B5E10026600515E89070382107EB9`
- `themes.ts`: `1719A8DEBD8136D828AE292D1D483C20C7C5A8A90DC509B7F01C70E8D0310738`
- `src/assets/tony-execos-approved.png`: `D7401222838C864A67F4BDE00AF2EE695DA8EF3EC68B0C8B05A63864BA0AFE1D`

`Tony/ACTIVE_REFERENCE.md` and `src/assets/tony-execos-approved.md` identify the selected greige/champagne image and original corner ribbon placement; the later raised-corner/continuous-ribbon experiments are excluded. The selected existing image was inspected as corroboration. The separately referenced ChatGPT attachment `/mnt/data/2955.jpg` is unavailable on this Windows host and was not inspected. No images were generated, substituted into the tool, or used as a screenshot UI.

## Direct style mapping

| Source | Travel use |
| --- | --- |
| `champagneClaret.colors` | Champagne canvas `#e6dfd2`, elevated `#f4eee3`, borders `#c4b79e` / `#aa9a7e`, oxblood `#73172b`, ink `#0b1c2b`, muted ink `#344350` |
| `.xo-phone` | Exact radial champagne gradient: `ellipse at 46% 33%, #f6f1e7 0, #e6dfd2 42%, #c6bfb3 100%` |
| `.xo-ribbon`, top/bottom variants | Exact five-stop 155-degree oxblood gradient, metallic edge, inset highlight, rotation and curved folds; sized/offset to existing travel header and bottom corner. Upper offset avoids covering existing brand text. |
| `.xo-ticker` | Exact `120deg, #0e1b29, #233647 48%, #101f2d` granite finish, champagne rails and inset highlights on existing expense stats and status badge; no ticker added |
| `.xo-tile`, `.xo-primary` | Champagne/oxblood control gradients, metallic border, inset edge and shadow, active press feedback |
| Workflow fields, recommendation/status/error styles | Warm paper fields and review surfaces, oxblood links/errors, champagne borders |
| `themes.ts` font registry and `src/routes/__root.tsx` | Figtree live text and Marcellus wordmark; same Google Fonts stylesheet. System/Georgia fallback if external fonts are unavailable. |

The source's home logo and fixed Answer/Ask/Upload artwork use cropped regions of the selected bitmap. Those Tony-specific components are not appropriate for the existing Travel Desk controls. Native travel controls retain their own labels and use the source's CSS workflow control finish. The bitmap's condensed typeface is unverified; no exact match is claimed.

The travel React file, data model, parser/export imports, review gates, labels, grids, breakpoints and section order are unchanged. There are no changes under `src/`, to main, or to Executive Communicator files.

## Executed local checks

- Production build: passed (`node node_modules/vite/bin/vite.js build --config mini-tools/travel-expense/vite.config.ts`). Existing large ExcelJS chunk and mixed dynamic/static import warnings remain.
- TypeScript: passed (`node node_modules/typescript/bin/tsc --noEmit -p mini-tools/travel-expense/tsconfig.json`).
- Existing mini-tool regression suite: 6/6 passed (`node node_modules/vitest/vitest.mjs run --config mini-tools/travel-expense/vitest.config.ts`).
- Built-app headless Edge checks: 320, 375, 440 and 1280 px. Empty state, fictional sample, manual expense review/confirmation, persistence after reload, expected one/two column grid, no horizontal overflow and no page errors. Word and Excel files downloaded successfully at desktop size.
- Visual QA: empty, review and populated states captured; inspected mobile and desktop screenshots. These checks do not establish universal OCR/PDF extraction or a pixel match to the unavailable attachment.

Dependencies were reused from the existing installed checkout; CI uses the branch's frozen Bun lockfile. Draft PR #5 remains the review surface. No merge or deployment.
