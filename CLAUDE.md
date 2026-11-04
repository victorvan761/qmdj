# 奇门排盘 · Qi Men Chart

A static web app that reproduces 玄天排盘's hour chart exactly, plus an English / 简体中文 toggle.

## Where things are

- `SPEC.md`: the contract. §5–§6 for the engine, §2–§4 for the UI, §9 for open questions.
- `fixtures/golden_charts.json`: golden charts. R1–R6 come from the reference screenshots and must always pass. D1–D13 are unconfirmed defaults.
- `docs/reference/`: the 玄天排盘 screenshots the UI must match.
- `tools/reference/`: the Python reference engine that generated the fixtures. Never hand-edit fixtures; regenerate them (see its README).

## How to work here

- Build engine first and test-first, in the order SPEC §10 gives.
- Keep the engine pure and language-neutral; the UI does the translating.
- Run the full test suite before calling anything done.
- When an open question in SPEC §9 is answered, update SPEC.md, flip the setting, and regenerate the fixtures.
- Add the build and test commands here once they exist.

## Commands

Node 24 lives at `~/.local/node/bin`, which isn't on the PATH. Run `export PATH="$HOME/.local/node/bin:$PATH"` first.

- `npm test`: the whole Vitest suite.
- `npm run typecheck`: strict TypeScript over `src` and `tests`.
- `node tools/reference/check_lunar_typescript.mjs`: lunar-typescript against the fixtures' calendar fields. Expect 0 mismatches.
- The reference engine runs from the `.venv` virtualenv (gitignored; `python3 -m venv .venv && .venv/bin/pip install lunar_python==1.4.8`):
  - `.venv/bin/python tools/reference/verify.py`: the engine against the screenshots. Expect 0 mismatches.
  - `.venv/bin/python tools/reference/gen_fixtures.py`: rewrites `fixtures/golden_charts.json`.
