// SPEC §5 steps 1–3: the time basis, the calendar (lunar-typescript) and the 节气 / 符头 / 元.
import { Solar } from 'lunar-typescript';
import { JIEQI, YUAN_BY_BRANCH, ganZhiAt, ganZhiIndex } from './tables';
import type { Branch, ChartInput, JieQiInfo, JieQiName, LunarParts, Pillars, Settings } from './types';

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysInMonth = (y: number, m: number) => (m === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[m - 1]);

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
  lunarParts: LunarParts;
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

  const lunarMonth = lunar.getMonth(); // negative for a leap month
  return {
    solar: `${pad(year, 4)}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`,
    lunar: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    lunarParts: { yearGanZhi: lunar.getYearInGanZhi(), month: Math.abs(lunarMonth), leap: lunarMonth < 0, day: lunar.getDay() },
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
