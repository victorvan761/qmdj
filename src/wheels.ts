// The date picker's five wheels as pure data (SPEC §2): what each one lists and where it stands, in 公历 or 农历.
// No DOM here, so every turn of a wheel can be tested. DatePicker.tsx draws them.
import { Lunar, LunarUtil, LunarYear, Solar } from 'lunar-typescript';
import { MAX_YEAR, MIN_YEAR, daysInMonth, formatInput, parseInput, type ChartInput } from './engine';

/** 公历 or 农历 */
export type CalendarKind = 'solar' | 'lunar';
export type WheelUnit = 'year' | 'month' | 'day' | 'hour' | 'minute';

export interface WheelItem {
  value: number;
  text: string;
}

export interface Wheel {
  unit: WheelUnit;
  /** 年 月 日 时 分, read by screen readers */
  name: string;
  items: readonly WheelItem[];
  /** The item on the selection line */
  index: number;
}

/** A calendar date. As a 农历 date, `month` is negative for a leap month (闰六月 is -6), as lunar-typescript counts. */
export interface Ymd {
  year: number;
  month: number;
  day: number;
}

/**
 * Where the wheels were turned to, in the calendar they show. The month and day stay as turned even where the
 * year or month now showing has no such month or day: the wheels then show the nearest one, and turning on to a
 * month that has it brings it back. So going from 1月31日 past 2月 to 3月 lands on 3月31日.
 */
export interface Draft extends Ymd {
  kind: CalendarKind;
  hour: number;
  minute: number;
}

// ── 公历 ↔ 农历 ──────────────────────────────────────────────────────────────────────────────────────────────

/** The 农历 date of a 公历 date. The date changes at midnight, as the chart's 阴历 row does. */
export function solarToLunar({ year, month, day }: Ymd): Ymd {
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  return { year: lunar.getYear(), month: lunar.getMonth(), day: lunar.getDay() };
}

/** The 公历 date of a 农历 date. */
export function lunarToSolar({ year, month, day }: Ymd): Ymd {
  const solar = Lunar.fromYmd(year, month, day).getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
}

/** One month of a 农历 year, with the first and last of its days that fall in 1900–2100. */
export interface LunarMonthSpan {
  month: number;
  first: number;
  last: number;
}

/**
 * The months of a 农历 year in order, a leap month after its regular one. Months wholly outside 1900–2100 are left
 * out: 农历 1899 keeps only 腊月 (1900-01-01 is its 初一), and 农历 2100's 腊月 ends at 初一 (2100-12-31).
 */
export function lunarMonths(year: number): LunarMonthSpan[] {
  const min = Solar.fromYmd(MIN_YEAR, 1, 1);
  const max = Solar.fromYmd(MAX_YEAR, 12, 31);
  return LunarYear.fromYear(year).getMonthsInYear().flatMap((m) => {
    const start = Lunar.fromYmd(year, m.getMonth(), 1).getSolar();
    const first = Math.max(1, min.subtract(start) + 1);
    const last = Math.min(m.getDayCount(), max.subtract(start) + 1);
    return first <= last ? [{ month: m.getMonth(), first, last }] : [];
  });
}

// ── What each wheel lists ────────────────────────────────────────────────────────────────────────────────────

const span = (from: number, to: number, text: (n: number) => string): readonly WheelItem[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, text: text(from + i) }));

/**
 * The answer for a key, worked out the first time it is asked for. The wheels ask again on every turn, and a
 * wheel that gets the very same list as before is neither drawn again nor moved.
 */
const answers = new Map<string, unknown>();
function once<T>(key: string, work: () => T): T {
  if (!answers.has(key)) answers.set(key, work());
  return answers.get(key) as T;
}

interface Calendar {
  years: readonly WheelItem[];
  months(year: number): readonly WheelItem[];
  days(year: number, month: number): readonly WheelItem[];
}

const yearText = (year: number) => `${year}年`;
const SOLAR_MONTHS = span(1, 12, (m) => `${m}月`);
const HOURS = span(0, 23, (h) => `${h}时`);
const MINUTES = span(0, 59, (m) => `${m}分`);

const SOLAR: Calendar = {
  years: span(MIN_YEAR, MAX_YEAR, yearText),
  months: () => SOLAR_MONTHS,
  days: (year, month) => {
    const count = daysInMonth(year, month);
    return once(`公历 ${count} days`, () => span(1, count, (d) => `${d}日`));
  },
};

/** 农历 months and days go by the names the chart's 阴历 row uses: 正月 … 腊月, 闰六月, 初一 … 三十. */
const lunarMonthName = (month: number) => `${month < 0 ? '闰' : ''}${LunarUtil.MONTH[Math.abs(month)]}月`;
const lunarDayName = (day: number) => LunarUtil.DAY[day];
const monthsOf = (year: number) => once(`农历 ${year}`, () => lunarMonths(year));

/** 农历 years, months and days are limited to those inside 1900–2100 of 公历: 1899年腊月初一 to 2100年腊月初一. */
const LUNAR: Calendar = {
  years: span(
    solarToLunar({ year: MIN_YEAR, month: 1, day: 1 }).year,
    solarToLunar({ year: MAX_YEAR, month: 12, day: 31 }).year,
    yearText,
  ),
  months: (year) =>
    once(`农历 ${year} months`, () => monthsOf(year).map(({ month }) => ({ value: month, text: lunarMonthName(month) }))),
  days: (year, month) => {
    const { first, last } = monthsOf(year).find((m) => m.month === month)!;
    return once(`农历 days ${first}–${last}`, () => span(first, last, lunarDayName));
  },
};

// ── Where each wheel stands ──────────────────────────────────────────────────────────────────────────────────

/** Where `want` is in the list, or the nearest the list has: 六月 for a 闰六月 this year lacks, the 28th for the 31st. */
function nearest(items: readonly WheelItem[], want: number): number {
  const exact = items.findIndex((item) => item.value === want);
  if (exact >= 0) return exact;
  const gap = (item: WheelItem) => Math.abs(Math.abs(item.value) - Math.abs(want));
  return items.reduce((best, item, i) => (gap(item) < gap(items[best]) ? i : best), 0);
}

/** The five wheels, left to right: 年 月 日 时 分. */
export function wheels(draft: Draft): Wheel[] {
  const calendar = draft.kind === 'solar' ? SOLAR : LUNAR;
  const years = calendar.years;
  const year = nearest(years, draft.year);
  const months = calendar.months(years[year].value);
  const month = nearest(months, draft.month);
  const days = calendar.days(years[year].value, months[month].value);
  const day = nearest(days, draft.day);
  return [
    { unit: 'year', name: '年', items: years, index: year },
    { unit: 'month', name: '月', items: months, index: month },
    { unit: 'day', name: '日', items: days, index: day },
    { unit: 'hour', name: '时', items: HOURS, index: draft.hour },
    { unit: 'minute', name: '分', items: MINUTES, index: draft.minute },
  ];
}

/** The draft with the month and day the wheels show. */
function shown(draft: Draft): Draft {
  const [year, month, day] = wheels(draft).map((wheel) => wheel.items[wheel.index].value);
  return { ...draft, year, month, day };
}

/** The picked time in 公历, whichever calendar the wheels show. */
function solarTime(draft: Draft): ChartInput {
  const { kind, year, month, day, hour, minute } = shown(draft);
  const date = { year, month, day };
  return { ...(kind === 'lunar' ? lunarToSolar(date) : date), hour, minute };
}

// ── Opening, turning, switching, reading ─────────────────────────────────────────────────────────────────────

/** The wheels for a time written 'YYYY-MM-DDTHH:mm', which must be a real minute from 1900 to 2100. They open in 公历. */
export function openDraft(value: string): Draft {
  const time = parseInput(value);
  if (!time) throw new RangeError(`the wheels can't open on ${JSON.stringify(value)}: not a real minute from 1900 to 2100`);
  return { kind: 'solar', ...time };
}

/** One wheel turned to a value from its list. */
export function turn(draft: Draft, unit: WheelUnit, value: number): Draft {
  // Choosing a day settles on the month it was chosen in. The other wheels leave the month and day as turned.
  return { ...(unit === 'day' ? shown(draft) : draft), [unit]: value };
}

/** The same day and time on the other calendar's wheels. */
export function switchKind(draft: Draft, kind: CalendarKind): Draft {
  if (kind === draft.kind) return draft;
  const time = solarTime(draft);
  return kind === 'solar' ? { kind, ...time } : { kind, ...time, ...solarToLunar(time) };
}

/** The picked time as 'YYYY-MM-DDTHH:mm' in 公历: always a real minute from 1900 to 2100. */
export const draftValue = (draft: Draft): string => formatInput(solarTime(draft));
