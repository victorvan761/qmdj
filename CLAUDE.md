# 奇门排盘 · Qi Men Chart

A static web app that reproduces 玄天排盘's hour chart exactly, plus an English / 简体中文 toggle.

## Where things are

- `SPEC.md`: the contract. §5–§6 for the engine, §2–§4 for the UI, §9 for open questions.
- `fixtures/golden_charts.json`: golden charts. R1–R6 come from the reference screenshots and must always pass. D1–D13 are unconfirmed defaults.
- `docs/reference/`: the 玄天排盘 screenshots the UI must match.
- `tools/reference/`: the Python reference engine that generated the fixtures. Never hand-edit fixtures; regenerate them (see its README).
- `src/engine/`: the pure engine. `tables.ts` holds SPEC §6, `calendar.ts` steps 1–3 (lunar-typescript), `castChart.ts` steps 4–12, ported line for line from `tools/reference/engine.py`.
- `src/i18n/`: `zh.ts` and `en.ts` (UI strings and glossary), plus `index.ts` (formatters). The UI translates engine IDs only here.
- `src/ui/`: the two screens. `state.ts` is the pure app reducer. `src/main.tsx` is the only place that reads the clock or `localStorage`.
- `tests/`: the Vitest suite. `tests/html.ts` parses `renderToStaticMarkup` output, so UI tests need no DOM.

## How to work here

- Build engine first and test-first, in the order SPEC §10 gives.
- Keep the engine pure and language-neutral; the UI does the translating.
- Run the full test suite before calling anything done. After a change to `src/ui/` or `src/i18n/`, also run the label-fit check (below) at 390 and 375 px wide in both languages: the suite runs in Node and can't see layout.
- When an open question in SPEC §9 is answered, update SPEC.md, flip the setting, and regenerate the fixtures.

## Commands

Node 24 lives at `~/.local/node/bin`, which isn't on the PATH. Run `export PATH="$HOME/.local/node/bin:$PATH"` first.

- `npm test`: the whole Vitest suite (engine, golden charts, 8,760-hour invariants, UI in both languages).
- `npm run typecheck`: strict TypeScript over `src` and `tests`.
- `npm run dev`: dev server, also `qmdj-dev` in `.claude/launch.json` (port 5180). If the page keeps showing old code after an edit, restart the server and open a fresh tab.
- `npm run build`: static site in `dist/` (relative paths, no network requests).
- Label fit (SPEC §8): with the dev server open at 390 px wide (then 375), run `const { fitCheck } = await import('/tools/fit-check.js'); await fitCheck()` in the page, once per language. It returns no problems when every grid label, the date picker's text and the scores fit.
- `node tools/reference/check_lunar_typescript.mjs`: lunar-typescript against the fixtures' calendar fields. Expect 0 mismatches.
- The reference engine runs from the `.venv` virtualenv (gitignored; `python3 -m venv .venv && .venv/bin/pip install lunar_python==1.4.8`):
  - `.venv/bin/python tools/reference/verify.py`: the engine against the screenshots. Expect 0 mismatches.
  - `.venv/bin/python tools/reference/gen_fixtures.py`: rewrites `fixtures/golden_charts.json`.
