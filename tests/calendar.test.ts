// SPEC §5 steps 1–3 (time basis, calendar, 节气 / 符头 / 元) against every golden case.
import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/golden_charts.json';
import { parseInput, readCalendar } from '../src/engine/calendar';
import { DEFAULTS } from '../src/engine/settings';

describe('calendar matches every golden case', () => {
  for (const c of fixtures.cases) {
    it(`${c.id} ${c.input}`, () => {
      const cal = readCalendar(parseInput(c.input), DEFAULTS);
      expect(cal.solar).toBe(c.header.solar);
      expect(cal.lunar).toBe(c.header.lunar);
      expect(cal.pillars).toEqual(c.header.pillars);
      expect(cal.jieqi).toEqual(c.jieqi);
    });
  }
});

describe('parseInput', () => {
  it('reads YYYY-MM-DDTHH:mm as wall-clock fields', () => {
    expect(parseInput('1996-06-20T18:16')).toEqual({ year: 1996, month: 6, day: 20, hour: 18, minute: 16 });
  });

  it('accepts both ends of 1900–2100 and 29 February in a leap year', () => {
    expect(parseInput('1900-01-01T00:00').year).toBe(1900);
    expect(parseInput('2100-12-31T23:59').year).toBe(2100);
    expect(parseInput('2024-02-29T12:00').day).toBe(29);
  });

  it.each([
    '1899-12-31T23:59', '2101-01-01T00:00', '2026-02-29T10:00', '2026-02-30T10:00', '2026-04-31T10:00',
    '2026-13-01T00:00', '2026-11-04T24:00', '2026-11-04T10:60', '2026-11-04', 'not a date',
  ])('rejects %s', (s) => {
    expect(() => parseInput(s)).toThrow(RangeError);
  });

  it('readCalendar rejects an out-of-range input object too', () => {
    expect(() => readCalendar({ year: 2101, month: 1, day: 1, hour: 0, minute: 0 }, DEFAULTS)).toThrow(RangeError);
  });
});
