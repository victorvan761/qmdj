// SPEC §8: castChart reproduces every golden chart, field for field.
// R1–R6 are 玄天排盘's own screenshots and must always pass. D1–D13 use the default rules and aren't confirmed yet.
import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/golden_charts.json';
import { parseInput } from '../src/engine/calendar';
import { castChart } from '../src/engine/castChart';
import type { PalaceNo } from '../src/engine/types';

type Case = (typeof fixtures.cases)[number];

function expectChart(c: Case) {
  const chart = castChart(parseInput(c.input));
  expect(chart.header, 'header').toEqual(c.header);
  expect(chart.lunarParts, 'lunarParts').toEqual(c.lunarParts);
  expect(chart.jieqi, 'jieqi').toEqual(c.jieqi);
  expect(chart.derived, 'derived').toEqual(c.derived);
  expect(chart.center, 'center').toBe(c.center);
  expect(Object.keys(chart.palaces).sort(), 'palace numbers').toEqual(Object.keys(c.palaces).sort());
  for (const [p, want] of Object.entries(c.palaces)) {
    expect(chart.palaces[Number(p) as PalaceNo], `palace ${p}`).toEqual(want);
  }
}

const title = (c: Case) => `${c.id} ${c.input} · ${c.note}${c.openQuestion ? ` (${c.openQuestion})` : ''}`;
const reference = fixtures.cases.filter((c) => c.confirmedInReference);
const unconfirmed = fixtures.cases.filter((c) => !c.confirmedInReference);

describe('R1–R6: 玄天排盘 screenshots (must pass)', () => {
  it('the fixture holds the six reference charts', () => {
    expect(reference.map((c) => c.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']);
  });
  for (const c of reference) it(title(c), () => expectChart(c));
});

describe('D1–D13: default rules, not yet confirmed in 玄天排盘', () => {
  for (const c of unconfirmed) it(title(c), () => expectChart(c));
});
