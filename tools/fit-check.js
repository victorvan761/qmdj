// Browser check for SPEC §8: "every label fits its cell at 390 px wide".
// With `npm run dev` running and the page at 390 px wide, run in the page's console:
//   const { fitCheck } = await import('/tools/fit-check.js'); console.table((await fitCheck()).problems);
// It casts every golden chart through the real UI: it turns the date picker's wheels to the time, confirms and
// taps 点击起局. It reports any label that overflows its column, is clipped by its palace, or overlaps another
// label. It also checks that the date field shows the whole time, and that the wheels' labels fit their columns
// and the sheet fits the screen. No problems means it passes.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(test, what) {
  for (let i = 0; i < 250; i++) {
    const result = test();
    if (result) return result;
    await sleep(20);
  }
  throw new Error(`timed out waiting for ${what}`);
}

const waitFor = (selector) => until(() => document.querySelector(selector), selector);

/** The box around an element's text, not its grid area. */
function inkBox(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
}

const overlap = (a, b) =>
  a.width && b.width && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;

function checkCell(id, cell, problems) {
  const p = cell.dataset.palace;
  const box = cell.getBoundingClientRect();
  for (const el of cell.querySelectorAll('.score, .god, .star, .door, .stems')) {
    if (el.scrollWidth > el.clientWidth + 0.5) {
      problems.push(`${id} ${p} ${el.dataset.k} "${el.textContent}" overflows ${el.scrollWidth}>${el.clientWidth}`);
    }
  }
  const items = [...cell.querySelectorAll('[data-k]')].filter((e) => e.dataset.k !== 'watermark' && e.textContent);
  const ink = items.map(inkBox);
  items.forEach((e, i) => {
    const r = ink[i];
    if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) {
      problems.push(`${id} ${p} ${e.dataset.k} "${e.textContent}" is clipped by its palace`);
    }
    for (let j = i + 1; j < items.length; j++) {
      if (overlap(r, ink[j])) problems.push(`${id} ${p} ${e.dataset.k} "${e.textContent}" overlaps ${items[j].dataset.k} "${items[j].textContent}"`);
    }
  });
}

/** The field's text shrinks to fit (fit.ts), so the whole time shows, at 10 px or more. */
function checkPicker(id, problems) {
  const el = document.querySelector('.picker-text');
  const size = parseFloat(getComputedStyle(el).fontSize);
  if (el.scrollWidth > el.clientWidth + 0.5) {
    problems.push(`${id} picker "${el.textContent}" overflows ${el.scrollWidth}>${el.clientWidth} at ${size}px`);
  }
  if (size < 10) problems.push(`${id} picker "${el.textContent}" is ${size}px`);
}

/** The open sheet: on the screen, every wheel's labels inside its column, the bar's buttons side by side. */
function checkSheet(id, problems) {
  const sheet = document.querySelector('.sheet').getBoundingClientRect();
  if (sheet.top < -0.5 || sheet.bottom > innerHeight + 0.5) problems.push(`${id} the sheet is ${Math.round(sheet.height)}px tall on a ${innerHeight}px screen`);
  for (const item of document.querySelectorAll('.wheel-item')) {
    if (item.scrollWidth > item.clientWidth + 0.5) {
      problems.push(`${id} wheel "${item.textContent}" overflows ${item.scrollWidth}>${item.clientWidth}`);
    }
  }
  const buttons = [...document.querySelectorAll('.sheet-bar button')].map((b) => b.getBoundingClientRect());
  buttons.forEach((b, i) => {
    if (b.left < -0.5 || b.right > innerWidth + 0.5 || (i && b.left < buttons[i - 1].right - 0.5)) problems.push(`${id} the sheet's buttons don't fit`);
  });
}

/** What the selection line reads. */
const onLine = () => [...document.querySelectorAll('.wheel-item[aria-selected="true"]')].map((e) => e.textContent).join(' ');

/** Opens the wheels, turns each to its part of 'YYYY-MM-DDTHH:mm' by scrolling it there, and taps 确定. */
async function pick(id, input, problems) {
  const parts = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+)$/.exec(input).slice(1).map(Number);
  (await waitFor('.picker')).click();
  const sheet = await waitFor('.sheet');
  // The sheet is measured where it comes to rest, not on its way up.
  await Promise.all(sheet.getAnimations().map((a) => a.finished));
  for (const [i, unit] of ['year', 'month', 'day', 'hour', 'minute'].entries()) {
    const wheel = document.querySelector(`.wheel[data-wheel="${unit}"]`);
    const item = () => wheel.querySelector(`[data-value="${parts[i]}"]`);
    const index = [...wheel.children].indexOf(item());
    wheel.scrollTop = (index / Math.max(1, wheel.children.length - 1)) * (wheel.scrollHeight - wheel.clientHeight);
    await until(() => item().getAttribute('aria-selected') === 'true', `${id} ${unit} wheel on ${parts[i]}`);
  }
  await sleep(60); // let the wheels come to rest
  const line = parts.map((n, i) => `${n}${'年月日时分'[i]}`).join(' ');
  if (onLine() !== line) problems.push(`${id} the wheels read "${onLine()}", not "${line}"`);
  checkSheet(id, problems);
  // 农历 and back shows the same day; its longest labels (闰六月) fit too.
  document.querySelector('[data-k="lunar"]').click();
  await sleep(60);
  checkSheet(`${id} 农历`, problems);
  document.querySelector('[data-k="solar"]').click();
  await sleep(60);
  if (onLine() !== line) problems.push(`${id} after 农历 and back the wheels read "${onLine()}", not "${line}"`);
  document.querySelector('[data-k="confirm"]').click();
  await until(() => !document.querySelector('.sheet'), 'the sheet to close');
}

export async function fitCheck() {
  const { cases } = await (await fetch('/fixtures/golden_charts.json')).json();
  const problems = [];
  document.querySelector('[data-k="cancel"]')?.click();
  document.querySelector('.back')?.click();
  for (const c of cases) {
    await pick(c.id, c.input, problems);
    await sleep(30);
    checkPicker(c.id, problems);
    (await waitFor('.btn.primary')).click();
    await waitFor('.grid');
    await sleep(80);
    if (!document.querySelector('[data-k="solar"]').textContent.startsWith(c.input.replace('T', ' '))) {
      problems.push(`${c.id} did not cast`);
    }
    for (const cell of document.querySelectorAll('.cell')) checkCell(c.id, cell, problems);
    if (document.documentElement.scrollWidth > innerWidth) problems.push(`${c.id} the chart screen is wider than the screen`);
    document.querySelector('.back').click();
    await waitFor('.btn.primary');
  }
  return { width: innerWidth, height: innerHeight, cases: cases.length, problems };
}
