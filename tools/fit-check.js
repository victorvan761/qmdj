// Browser check for SPEC §8: "every label fits its cell at 390 px wide".
// With `npm run dev` running and the page at 390 px wide, in the language to check, run in the page's console:
//   const { fitCheck } = await import('/tools/fit-check.js'); console.table((await fitCheck()).problems);
// It casts every golden chart through the real UI and reports any label that overflows its column after
// shrinking, is below 10 px, is clipped by its palace, or overlaps another label. It also checks that the date
// picker shows the whole time and that a chart's scores share one size. No problems means it passes.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(selector) {
  for (let i = 0; i < 250; i++) {
    const el = document.querySelector(selector);
    if (el) return el;
    await sleep(20);
  }
  throw new Error(`timed out waiting for ${selector}`);
}

function setInput(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

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
  let smallest = Infinity;
  for (const el of cell.querySelectorAll('[data-fit]')) {
    const size = parseFloat(getComputedStyle(el).fontSize);
    smallest = Math.min(smallest, size);
    if (el.scrollWidth > el.clientWidth + 0.5) {
      problems.push(`${id} ${p} ${el.dataset.k} "${el.textContent}" overflows ${el.scrollWidth}>${el.clientWidth} at ${size}px`);
    }
    if (size < 10) problems.push(`${id} ${p} ${el.dataset.k} "${el.textContent}" is ${size}px`);
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
  return smallest;
}

/** The picker's text shrinks to fit (fit.ts), so the whole time shows, at 10 px or more. */
function checkPicker(id, problems) {
  const el = document.querySelector('.picker-text');
  const size = parseFloat(getComputedStyle(el).fontSize);
  if (el.scrollWidth > el.clientWidth + 0.5) {
    problems.push(`${id} picker "${el.textContent}" overflows ${el.scrollWidth}>${el.clientWidth} at ${size}px`);
  }
  if (size < 10) problems.push(`${id} picker "${el.textContent}" is ${size}px`);
}

/** Scores differ only in value: one font size for all of them. */
function checkScores(id, problems) {
  const sizes = new Set([...document.querySelectorAll('.cell .score')].map((e) => getComputedStyle(e).fontSize));
  if (sizes.size > 1) problems.push(`${id} scores render at ${[...sizes].join(', ')}`);
}

export async function fitCheck() {
  const { cases } = await (await fetch('/fixtures/golden_charts.json')).json();
  const problems = [];
  let smallestPx = Infinity;
  document.querySelector('.back')?.click();
  for (const c of cases) {
    setInput(await waitFor('input[type="datetime-local"]'), c.input);
    await sleep(30);
    checkPicker(c.id, problems);
    (await waitFor('.btn.primary')).click();
    await waitFor('.grid');
    await sleep(80);
    if (!document.querySelector('[data-k="solar"]').textContent.startsWith(c.input.replace('T', ' '))) {
      problems.push(`${c.id} did not cast`);
    }
    checkScores(c.id, problems);
    for (const cell of document.querySelectorAll('.cell')) smallestPx = Math.min(smallestPx, checkCell(c.id, cell, problems));
    document.querySelector('.back').click();
    await waitFor('.btn.primary');
  }
  return { lang: document.documentElement.lang, width: innerWidth, cases: cases.length, smallestPx, problems };
}
