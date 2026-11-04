# Reference engine

Python implementation of SPEC §5 used to check the rules against the 玄天排盘 screenshots and to generate
`fixtures/golden_charts.json`. The app doesn't use it at runtime.

Run from the repo root:

```
pip install lunar_python==1.4.8
python tools/reference/verify.py         # R1–R6: 474 fields vs the screenshots, expect 0 mismatches
python tools/reference/gen_fixtures.py   # rewrites fixtures/golden_charts.json
```

Optional: confirm the app's calendar library agrees with the fixtures.

```
npm install lunar-typescript@1.8.6
node tools/reference/check_lunar_typescript.mjs   # expect 0 calendar mismatches
```

If 玄天排盘 answers an open question (SPEC §9) differently from the default, change the matching parameter in
`engine.chart()` (`zi_rollover_23`, `term_rule`), regenerate, and update the app's defaults to match.
