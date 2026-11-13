# 奇门排盘 · Qi Men Chart

A static web app that reproduces 玄天排盘's hour chart exactly, in 简体中文 only. This is v2, a rebuild of v1 with the same behavior. README.md is the tour for people.

## Where things are

- `SPEC.md`: the contract. §5–§6 for the engine, §2–§4 for the UI, §9 for open questions.
- `reference/`: 玄天排盘, what the app must match.
  - `screenshots/`: the screens the UI must match.
  - `golden_charts.json`: the golden charts. R1–R6 come from the screenshots and must always pass. D1–D13 are unconfirmed defaults. Never hand-edit it; regenerate it.
  - `engine.py`, `verify.py`, `gen_fixtures.py`: the Python reference engine that generates the golden charts.
- `src/engine.ts`: the pure engine, in one file: the chart's types (SPEC §7), the tables (§6), then `castChart`, the twelve steps of §5 in order. Steps 1–3 use lunar-typescript.
- `src/wheels.ts`: what the date picker's five wheels list and where they stand, as pure data, with the 公历 ↔ 农历 conversions they need. `src/DatePicker.tsx` draws them, copied from `reference/screenshots/date_picker.jpg`.
- `src/App.tsx`: the pure app reducer, and the browser glue (history, clock, focus). `src/InputScreen.tsx` and `src/ChartScreen.tsx` are the two screens, with their 中文 text written where it is shown (SPEC §4). `src/styles.css` holds every style. `src/main.tsx` is the only place that reads the clock or registers the service worker.
- `src/sw.js`, `vite.config.ts`, `public/`: the offline copy and the home-screen install (SPEC §11). `vite.config.ts` writes `dist/sw.js` at build time. `.github/workflows/deploy.yml` tests every push and publishes `main` to GitHub Pages.
- `tests/`: the Vitest suite, one file per area. `tests/html.ts` parses `renderToStaticMarkup` output, so UI tests need no DOM.
- `tools/`: `fit-check.js` (below) and `make-icons.mjs`.

## How to work here

- Work test-first.
- Keep the engine pure: no clock reads, no DOM, no React. Its values are the Chinese terms the chart shows.
- Run the full test suite before calling anything done. After a change to a screen or to `src/styles.css`, also run the label-fit check (below) at 390 and 375 px wide: the suite runs in Node and can't see layout.
- A change to `src/sw.js` or to the step that writes it reaches installed phones without anyone watching. Keep such changes small, and try the result with `npm run preview`.
- When an open question in SPEC §9 is answered, update SPEC.md, flip the setting, and regenerate the golden charts. For Q1–Q3 the setting is `DEFAULTS` in `src/engine.ts` and the matching parameter of `chart()` in `reference/engine.py`.

## Commands

Node 24 lives at `~/.local/node/bin`, which isn't on the PATH. Run `export PATH="$HOME/.local/node/bin:$PATH"` first.

- `npm test`: the whole Vitest suite (engine, golden charts, 8,760-hour invariants, wheels, UI, offline copy).
- `npm run typecheck`: strict TypeScript over `src`, `tests` and `vite.config.ts`.
- `npm run dev`: dev server, also `qmdj-dev` in `.claude/launch.json` (port 5180). If the page keeps showing old code after an edit, restart the server and open a fresh tab.
- `npm run build`: static site in `dist/` (relative paths, no network requests beyond its own files).
- `npm run preview`: serves `dist/`. The only local way to try the offline copy: the dev server has no service worker.
- `node tools/make-icons.mjs`: redraws the home-screen icons in `public/`.
- Label fit (SPEC §8): with the dev server open at 390 px wide (then 375), run `const { fitCheck } = await import('/tools/fit-check.js'); await fitCheck()` in the page. It returns no problems when every grid label and the date picker's text fit.
- The reference engine runs from the `.venv` virtualenv (gitignored; `python3 -m venv .venv && .venv/bin/pip install lunar_python==1.4.8`):
  - `.venv/bin/python reference/verify.py`: the engine against the screenshots. Expect 0 mismatches.
  - `.venv/bin/python reference/gen_fixtures.py`: rewrites `reference/golden_charts.json`.
