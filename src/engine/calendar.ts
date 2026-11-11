// SPEC §5 steps 1–3: the time basis, the calendar (lunar-typescript) and the 节气 / 符头 / 元.
import { Lunar, LunarUtil, LunarYear, Solar } from 'lunar-typescript';
import { JIEQI, YUAN_BY_BRANCH, ganZhiAt, ganZhiIndex } from './tables';
import type { Branch, ChartInput, JieQiInfo, JieQiName, Pillars, Settings } from './types';

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** Days in a 公历 month. */
export const daysInMonth = (y: number, m: number) => (m === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[m - 1]);

/** A calendar date. As a 农历 date, `month` is negative for a leap month (闰六月 is -6), as lunar-typescript counts. */
export interface Ymd {
  year: number;
  month: number;
  day: number;
}

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

/** 正月 … 腊月, 闰六月: the names the chart's 阴历 row uses. */
export const lunarMonthName = (month: number): string => `${month < 0 ? '闰' : ''}${LunarUtil.MONTH[Math.abs(month)]}月`;

/** 初一 … 三十. */
export const lunarDayName = (day: number): string => LunarUtil.DAY[day];

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Throws RangeError unless the input is a real minute between 1900-01-01 00:00 and 2100-12-31 23:59. */
export function checkInput(input: ChartInput): void {
  const { year, month, day, hour, minute } = input;
  const ints = [year, month, day, hour, minute].every(Number.isInteger);
  if (!ints || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`year must be an integer from ${MIN_YEAR} to ${MAX_YEAR}: ${JSON.stringify(input)}`);
  }
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`no such date: ${year}-${pad(month)}-${pad(day)}`);
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new RangeError(`no such time: ${pad(hour)}:${pad(minute)}`);
  }
}

/** Reads 'YYYY-MM-DDTHH:mm' (the date picker's and the fixtures' format) as Beijing wall-clock time (step 1). */
export function parseInput(s: string): ChartInput {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) throw new RangeError(`expected YYYY-MM-DDTHH:mm, got ${JSON.stringify(s)}`);
  const input = { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] };
  checkInput(input);
  return input;
}

/** The input as 'YYYY-MM-DDTHH:mm'. */
export const formatInput = ({ year, month, day, hour, minute }: ChartInput): string =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;

export interface CalendarInfo {
  /** 'YYYY-MM-DD HH:mm:00' */
  solar: string;
  /** '丙子年 五月初五' */
  lunar: string;
  pillars: Pillars;
  jieqi: JieQiInfo;
}

function asJieQi(name: string): JieQiName {
  if (!(JIEQI as readonly string[]).includes(name)) throw new Error(`unexpected 节气 name from lunar-typescript: ${name}`);
  return name as JieQiName;
}

/** Steps 2–3. The input is read as given: no time-zone conversion, no DST removal, no 真太阳时. */
export function readCalendar(input: ChartInput, settings: Settings): CalendarInfo {
  checkInput(input);
  const { year, month, day, hour, minute } = input;
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const exact = settings.termSwitch === 'exact';

  const pillars: Pillars = {
    year: exact ? lunar.getYearInGanZhiExact() : lunar.getYearInGanZhiByLiChun(),
    month: exact ? lunar.getMonthInGanZhiExact() : lunar.getMonthInGanZhi(),
    day: settings.ziHour === '23:00' ? lunar.getDayInGanZhiExact() : lunar.getDayInGanZhiExact2(),
    hour: lunar.getTimeInGanZhi(),
  };

  // 节气: the latest of the 24 terms at or before the instant (or that day, for termSwitch 'day').
  const prev = lunar.getPrevJieQi(!exact);
  const next = lunar.getNextJieQi(!exact);

  // 符头: the latest 甲 or 己 day on or before the 日柱; its branch gives the 元.
  const dn = ganZhiIndex(pillars.day);
  const fuTou = ganZhiAt(dn - ((dn % 10) % 5));

  return {
    solar: `${pad(year, 4)}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`,
    lunar: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    pillars,
    jieqi: {
      current: asJieQi(prev.getName()),
      currentStart: prev.getSolar().toYmdHms(),
      next: asJieQi(next.getName()),
      nextStart: next.getSolar().toYmdHms(),
      yuan: YUAN_BY_BRANCH[fuTou[1] as Branch],
      fuTou,
    },
  };
}
