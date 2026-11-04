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
