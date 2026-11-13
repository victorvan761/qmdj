// The date picker's wheels (SPEC §2): what each lists in 公历 and 农历, and that every turn gives a real time.
import { describe, expect, it } from 'vitest';
import golden from '../reference/golden_charts.json';
import { daysInMonth, parseInput } from '../src/engine';
import {
  draftValue, lunarMonths, lunarToSolar, openDraft, solarToLunar, switchKind, turn, wheels, type Draft, type WheelUnit,
} from '../src/wheels';

/** What the selection line reads, left to right. */
const reads = (draft: Draft) => wheels(draft).map((w) => w.items[w.index].text).join(' ');
const texts = (draft: Draft, unit: WheelUnit) => wheels(draft).find((w) => w.unit === unit)!.items.map((i) => i.text);
const lunar = (value: string) => switchKind(openDraft(value), 'lunar');

describe('公历 wheels', () => {
  const draft = openDraft('2026-11-10T19:17');

  it('open on the field’s time, as in 玄天排盘: 2026年 11月 10日 19时 17分', () => {
    expect(wheels(draft).map((w) => w.name)).toEqual(['年', '月', '日', '时', '分']);
    expect(reads(draft)).toBe('2026年 11月 10日 19时 17分');
    expect(draftValue(draft)).toBe('2026-11-10T19:17');
  });

  it('list 1900–2100, 12 months, the days of the month, 0–23时 and 0–59分', () => {
    const years = texts(draft, 'year');
    expect([years[0], years.at(-1), years.length]).toEqual(['1900年', '2100年', 201]);
    expect(texts(draft, 'month')).toEqual(['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']);
    expect(texts(draft, 'day').at(-1)).toBe('30日');
    expect(texts(turn(draft, 'month', 12), 'day').at(-1)).toBe('31日');
    expect(texts(draft, 'hour')).toEqual(Array.from({ length: 24 }, (_, h) => `${h}时`));
    expect([texts(draft, 'minute')[0], texts(draft, 'minute').at(-1)]).toEqual(['0分', '59分']);
  });

  it('turning a wheel changes that part only', () => {
    expect(draftValue(turn(draft, 'year', 1996))).toBe('1996-11-10T19:17');
    expect(draftValue(turn(draft, 'month', 6))).toBe('2026-06-10T19:17');
    expect(draftValue(turn(draft, 'day', 20))).toBe('2026-11-20T19:17');
    expect(draftValue(turn(draft, 'hour', 0))).toBe('2026-11-10T00:17');
    expect(draftValue(turn(draft, 'minute', 59))).toBe('2026-11-10T19:59');
  });

  it('a month without the 31st shows its last day, and the 31st comes back in a month that has it', () => {
    const jan31 = openDraft('2026-01-31T08:00');
    const feb = turn(jan31, 'month', 2);
    expect([reads(feb), draftValue(feb)]).toEqual(['2026年 2月 28日 8时 0分', '2026-02-28T08:00']);
    expect(draftValue(turn(feb, 'month', 3))).toBe('2026-03-31T08:00');
    expect(draftValue(turn(feb, 'year', 2024))).toBe('2024-02-29T08:00');
    // A day chosen in the short month is the day from then on.
    expect(draftValue(turn(turn(feb, 'day', 27), 'month', 3))).toBe('2026-03-27T08:00');
  });

  it('keeps the same list for a wheel that did not change, so it need not be drawn again', () => {
    const [years, months, days, hours, minutes] = wheels(draft).map((w) => w.items);
    const next = wheels(turn(draft, 'month', 4)).map((w) => w.items); // 4月 has 30 days too
    expect(next.every((items, i) => items === [years, months, days, hours, minutes][i])).toBe(true);
  });
});

describe('农历 wheels', () => {
  it('show the same day in 农历, with the month and day names of the chart’s 阴历 row', () => {
    expect(reads(lunar('2026-11-10T19:17'))).toBe('2026年 十月 初二 19时 17分');
    expect(reads(lunar('1996-06-20T18:16'))).toBe('1996年 五月 初五 18时 16分'); // R1: 丙子年 五月初五
    expect(reads(lunar('2027-02-04T10:30'))).toBe('2026年 腊月 廿八 10时 30分'); // D11: 丙午年 腊月廿八
  });

  it('list a leap month after its regular month, in the years that have one', () => {
    const leap = lunar('2025-08-01T12:00'); // D6: 乙巳年 闰六月初八
    expect(reads(leap)).toBe('2025年 闰六月 初八 12时 0分');
    expect(texts(leap, 'month')).toEqual(['正月', '二月', '三月', '四月', '五月', '六月', '闰六月', '七月', '八月', '九月', '十月', '冬月', '腊月']);
    expect(texts(lunar('2026-11-10T19:17'), 'month')).toHaveLength(12);
  });

  it('list 29 or 30 days, 初一 to 廿九 or 三十', () => {
    const days = texts(lunar('2026-11-10T19:17'), 'day'); // 十月 of 2026 has 30 days
    expect([days[0], days[9], days[19], days.at(-1), days.length]).toEqual(['初一', '初十', '二十', '三十', 30]);
    expect(texts(lunar('2027-01-10T08:00'), 'day').at(-1)).toBe('廿九'); // 腊月 of 2026 has 29
  });

  it('a year without the leap month shows the regular one, and the leap month comes back', () => {
    const leap = lunar('2025-08-01T12:00');
    const next = turn(leap, 'year', 2026);
    expect(reads(next)).toBe('2026年 六月 初八 12时 0分');
    expect(draftValue(next)).toBe('2026-07-21T12:00');
    expect(reads(turn(next, 'year', 2025))).toBe('2025年 闰六月 初八 12时 0分');
    // A day chosen in 六月 settles on 六月.
    expect(reads(turn(turn(next, 'day', 9), 'year', 2025))).toBe('2025年 六月 初九 12时 0分');
  });

  it('a 29-day month shows 廿九 for 三十, and 三十 comes back', () => {
    const thirty = lunar('2026-12-08T08:00'); // 十月三十
    expect(reads(thirty)).toBe('2026年 十月 三十 8时 0分');
    const short = turn(thirty, 'month', 12);
    expect([reads(short), draftValue(short)]).toEqual(['2026年 腊月 廿九 8时 0分', '2027-02-05T08:00']);
    expect(reads(turn(short, 'month', 11))).toBe('2026年 冬月 三十 8时 0分');
  });

  it('switching back to 公历 gives the same day, for every golden case', () => {
    for (const c of golden.cases) {
      const there = lunar(c.input);
      expect(reads(there).split(' ').slice(1, 3).join(''), c.id).toBe(c.header.lunar.split(' ')[1]);
      expect(draftValue(there), c.id).toBe(c.input);
      expect(switchKind(there, 'solar'), c.id).toEqual(openDraft(c.input));
    }
  });

  it('switching to the calendar already showing changes nothing', () => {
    const draft = openDraft('2026-01-31T08:00');
    expect(switchKind(draft, 'solar')).toBe(draft);
  });

  it('switching calendars takes the day the wheels show, not one the month lacks', () => {
    const feb = turn(openDraft('2026-01-31T08:00'), 'month', 2); // shows 2月28日
    expect(draftValue(switchKind(feb, 'lunar'))).toBe('2026-02-28T08:00');
  });

  it('stop where 1900–2100 of 公历 stops: 1899年腊月初一 to 2100年腊月初一', () => {
    const first = lunar('1900-01-01T00:00');
    expect(reads(first)).toBe('1899年 腊月 初一 0时 0分');
    expect([texts(first, 'year')[0], texts(first, 'year').at(-1)]).toEqual(['1899年', '2100年']);
    expect(texts(first, 'month')).toEqual(['腊月']);
    expect(texts(first, 'day')).toHaveLength(30);

    const last = lunar('2100-12-31T23:59');
    expect(reads(last)).toBe('2100年 腊月 初一 23时 59分');
    expect(texts(last, 'day')).toEqual(['初一']);

    // From 2100年 冬月 三十, 腊月 has only 初一; from 1900年 三月, 1899 has only 腊月.
    expect(draftValue(turn(lunar('2100-12-30T12:00'), 'month', 12))).toBe('2100-12-31T12:00');
    expect(draftValue(turn(lunar('1900-04-15T12:00'), 'year', 1899))).toBe('1900-01-16T12:00');
  });
});

describe('the calendar conversions under the wheels', () => {
  it('every day from 1900 to 2100 goes to 农历 and back, inside the months and days the wheels list', () => {
    const spans = new Map<number, ReturnType<typeof lunarMonths>>();
    let days = 0;
    for (let year = 1900; year <= 2100; year++) {
      for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= daysInMonth(year, month); day++, days++) {
          const l = solarToLunar({ year, month, day });
          if (!spans.has(l.year)) spans.set(l.year, lunarMonths(l.year));
          const listed = spans.get(l.year)!.find((m) => m.month === l.month);
          if (!listed || l.day < listed.first || l.day > listed.last) {
            throw new Error(`${year}-${month}-${day} is 农历 ${l.year} ${l.month} ${l.day}, which the wheels don't list`);
          }
          // Back again, for the first day of each 农历 month: the days after it follow one by one.
          if (l.day === listed.first) expect(lunarToSolar(l), `${year}-${month}-${day}`).toEqual({ year, month, day });
        }
      }
    }
    // And the wheels list nothing more: as many 农历 days as 公历 days.
    const listed = [...spans.values()].flat().reduce((n, m) => n + m.last - m.first + 1, 0);
    expect([days, listed]).toEqual([73414, 73414]);
    expect(lunarMonths(1898)).toEqual([]);
    expect(lunarMonths(2101)).toEqual([]);
  });
});

describe('any turning of the wheels', () => {
  it('gives a real minute from 1900 to 2100, with every wheel on one of its items', () => {
    // A fixed pseudo-random walk: 4,000 turns and calendar switches.
    let seed = 20261110;
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return Math.floor((seed / 2147483648) * n);
    };
    let draft = openDraft('2026-11-10T19:17');
    for (let step = 0; step < 4000; step++) {
      if (random(8) === 0) {
        draft = switchKind(draft, draft.kind === 'solar' ? 'lunar' : 'solar');
      } else {
        const wheel = wheels(draft)[random(5)];
        // Mostly a neighbor, as a finger does; sometimes anywhere on the wheel, the ends included.
        const far = [0, wheel.items.length - 1, random(wheel.items.length)][random(3)];
        const to = random(4) === 0 ? far : Math.min(wheel.items.length - 1, Math.max(0, wheel.index + random(3) - 1));
        draft = turn(draft, wheel.unit, wheel.items[to].value);
      }
      const at = `step ${step}: ${JSON.stringify(draft)}`;
      for (const wheel of wheels(draft)) expect(wheel.items[wheel.index], at).toBeDefined();
      expect(parseInput(draftValue(draft)), at).not.toBeNull();
    }
  });
});
