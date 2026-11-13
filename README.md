# 奇门排盘 · Qi Men Chart

A small web app that casts a 奇门遁甲 hour chart (时家奇门 · 转盘 · 拆补法 · 寄坤二宫) and draws it the way the 玄天排盘 app does, in 简体中文. It is a static site with no server behind it. Added to an iPhone or iPad home screen, it opens full screen and works with no network.

Live at <https://victorvan761.github.io/qmdj/>.

This is **v2**: the app rebuilt from scratch against the same spec. It behaves and looks exactly as v1 did. Only the code is simpler: one engine file, one file per screen, 43 files where there were 60.

## Using it

1. Open the site in Safari on the iPhone or iPad, then Share → 添加到主屏幕. From then on it opens from its icon, online or not.
2. Tap the date to choose a time on the wheels, in 公历 or 农历. It starts at the current time.
3. Tap 点击起局 to see the chart. The arrow at the top goes back.

## Working on it

You need Node 22.12 or newer.

```
npm install
npm run dev         # dev server
npm test            # every test
npm run typecheck   # strict TypeScript
npm run build       # the static site, in dist/
npm run preview     # serves dist/: the only local way to try the offline copy
```

## What is where

```
SPEC.md                 what the app must do: screens, rules, tables, open questions
reference/              玄天排盘, the app this one matches
  screenshots/          six of its charts (R1–R6), its input screen and its date picker
  golden_charts.json    19 charts the engine must reproduce, field for field
  engine.py             a second engine, in Python, that wrote the golden charts
  verify.py             checks engine.py against the six screenshots
  gen_fixtures.py       rewrites golden_charts.json
src/
  engine.ts             a time in, the whole chart out, with every table it looks things up in
  wheels.ts             the date picker's five wheels as plain data, in 公历 and 农历
  App.tsx               what the app remembers, and its ties to the browser: history, clock, focus
  InputScreen.tsx       the first screen
  DatePicker.tsx        the sheet of wheels
  ChartScreen.tsx       the chart
  styles.css            every style, measured from the screenshots
  main.tsx              starts the app
  sw.js                 the service worker that keeps the offline copy
tests/                  the test suite: engine, wheels, screens, offline copy
tools/
  fit-check.js          checks in a real browser that every label fits its cell
  make-icons.mjs        draws the home-screen icons in public/
public/                 the icons and the web app manifest
vite.config.ts          build settings, and the step that writes dist/sw.js
.github/workflows/      tests every push and publishes main to GitHub Pages
```

## How it works

**The engine** is one pure function. `castChart({ year, month, day, hour, minute })` reads the time as Beijing wall-clock time and returns a `Chart`: the header, the 节气, and the eight outer palaces with every color and marker already decided. [src/engine.ts](src/engine.ts) reads top to bottom like the spec: the chart's shape (SPEC §7), the tables (§6), then the twelve steps (§5) in order. The calendar itself (四柱, 节气, 农历) comes from [lunar-typescript](https://github.com/6tail/lunar-typescript); everything after that is a lookup in a table or a turn of a ring.

**The screens** only draw what the engine returns. There are two, plus the date picker, which the app draws itself as five scrolling wheels so that it looks and works the same on every iPhone and iPad. What the wheels list and where they stand is plain data in [src/wheels.ts](src/wheels.ts), so it can be tested without a browser. The layout is drawn once, 390 units wide, and one CSS variable sets the size of a unit, which is how the same screens fit a phone, an upright iPad and an iPad on its side (SPEC §2).

**The offline copy** is a service worker, [src/sw.js](src/sw.js). The build puts two lines in front of it: the list of every built file, and a version that hashes them all. On the device it downloads those files once and then answers the app's requests from that copy. A new build downloads in the background and takes over the next time the app is opened; if any file fails to download, the old copy stays in use (SPEC §11).

## How it is kept correct

- **Golden charts.** [reference/golden_charts.json](reference/golden_charts.json) holds 19 charts. R1–R6 are 玄天排盘's own screenshots and must always pass. D1–D13 are edge cases worked out with the default rules, not yet confirmed in 玄天排盘. The tests compare `castChart` with each one, field for field.
- **Invariants.** Every hour of a year, 8,760 charts: each star, door and deity appears once, the 天盘 stems are the 地盘 stems rearranged, every 甲 hour is 伏吟.
- **The screens.** R1–R6 must render the same text, colors and markers as the screenshots. The date picker's wheels must give a real minute between 1900 and 2100 however they are turned.
- **The offline copy.** The service worker runs in the tests against a fake network, and the real build is checked for a complete file list.
- **Label fit.** The tests run in Node and can't see layout. After changing a screen or a style, open the dev server at 390 px wide (then 375) and run this in the page's console. It casts every golden chart through the real screens and returns no problems when everything fits:

  ```js
  const { fitCheck } = await import('/tools/fit-check.js'); await fitCheck()
  ```

### The reference engine

`reference/engine.py` is a second implementation of the rules, kept apart from the app on purpose: `verify.py` checks it against the six screenshots (474 fields), and `gen_fixtures.py` writes the golden charts from it. Never edit `golden_charts.json` by hand.

```
python3 -m venv .venv && .venv/bin/pip install lunar_python==1.4.8
.venv/bin/python reference/verify.py         # expect 0 mismatches
.venv/bin/python reference/gen_fixtures.py   # rewrites reference/golden_charts.json
```

### Open questions

Nine behaviors can't be settled from the six screenshots (SPEC §9). Each has a default, and a time to enter in 玄天排盘 to check it. When one is answered differently, update SPEC.md, change the rule in both engines (for Q1–Q3 that is one line: `DEFAULTS` in `src/engine.ts`, and the matching parameter of `chart()` in `reference/engine.py`), and regenerate the golden charts.

## Publishing

Every push and pull request runs the typecheck, the tests and the build on GitHub Actions. A push to `main` that passes is published to GitHub Pages. An installed copy downloads a new build in the background when it is opened with a network, and switches to it the next time it is opened.
