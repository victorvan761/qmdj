// The date picker's five wheels as pure data (SPEC §2): what each one lists and where it stands, in 公历 or 农历.
// No DOM, so every turn of a wheel is testable.
import {
  MAX_YEAR, MIN_YEAR, daysInMonth, formatInput, lunarDayName, lunarMonthName, lunarMonths, lunarToSolar, parseInput,
  solarToLunar, type ChartInput, type LunarMonthSpan, type Ymd,
} from '../engine';

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

/**
 * Where the wheels were turned to, in the calendar they show. In 农历 a leap month is negative (闰六月 is -6).
 * The month and day stay as turned even where the year or month now showing has no such month or day: the
 * wheels then show the nearest one, and turning on to a month that has it brings it back. So going from
 * 1月31日 past 2月 to 3月 lands on 3月31日.
 */
export interface Draft extends Ymd {
  kind: CalendarKind;
  hour: number;
  minute: number;
}

const span = (from: number, to: number, text: (n: number) => string): readonly WheelItem[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, text: text(from + i) }));

/** Each list is built once and reused, so a wheel whose list hasn't changed needn't be drawn again. */
const built = new Map<string, readonly WheelItem[]>();
function list(key: string, build: () => readonly WheelItem[]): readonly WheelItem[] {
  let items = built.get(key);
  if (!items) built.set(key, (items = build()));
  return items;
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
    return list(`solar ${count}`, () => span(1, count, (d) => `${d}日`));
  },
};

/** A 农历 year's months, worked out once: the wheels ask again on every turn. */
const spans = new Map<number, LunarMonthSpan[]>();
function monthsOf(year: number): LunarMonthSpan[] {
  let months = spans.get(year);
  if (!months) spans.set(year, (months = lunarMonths(year)));
  return months;
}

/** 农历 years, months and days are limited to those inside 1900–2100 of 公历: 1899年腊月初一 to 2100年腊月初一. */
const LUNAR: Calendar = {
  years: span(
    solarToLunar({ year: MIN_YEAR, month: 1, day: 1 }).year,
    solarToLunar({ year: MAX_YEAR, month: 12, day: 31 }).year,
    yearText,
  ),
  months: (year) =>
    list(`lunar ${year}`, () => monthsOf(year).map(({ month }) => ({ value: month, text: lunarMonthName(month) }))),
  days: (year, month) => {
    const { first, last } = monthsOf(year).find((m) => m.month === month)!;
    return list(`lunar ${first}-${last}`, () => span(first, last, lunarDayName));
  },
};

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

/** The wheels for a picker value, 'YYYY-MM-DDTHH:mm'. They open in 公历. */
export const openDraft = (value: string): Draft => ({ kind: 'solar', ...parseInput(value) });

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

/** The picked time as a picker value, 'YYYY-MM-DDTHH:mm' in 公历: always a real minute from 1900 to 2100. */
export const draftValue = (draft: Draft): string => formatInput(solarTime(draft));
