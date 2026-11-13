// The engine: castChart turns a Beijing wall-clock minute into the whole chart (SPEC §5).
// It is pure: no clock reads, no DOM, no React. Every value is the Chinese term the chart shows.
//
// Top to bottom: the chart's shape (SPEC §7), the tables (§6), reading a time, then the twelve steps (§5).
import { Solar } from 'lunar-typescript';

// ── The chart (SPEC §7) ──────────────────────────────────────────────────────────────────────────────────────

export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
/** The eight outer palaces, by 洛书 number. 中5 shows only its 地盘 stem, `Chart.center`. */
export type PalaceNo = 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9;
/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水';

/** Beijing wall-clock time, to the minute. */
export interface ChartInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** The two calendar conventions 玄天排盘 hasn't confirmed yet (SPEC §9). The app always uses DEFAULTS. */
export interface Settings {
  /** Q1: '23:00' puts 23:00–23:59 on the next day's 日柱; '00:00' keeps it on the calendar day. */
  ziHour: '23:00' | '00:00';
  /** Q2, Q3: 年柱, 月柱 and the 节气 switch at the exact 节气 instant ('exact') or at 00:00 of that day ('day'). */
  termSwitch: 'exact' | 'day';
}

export const DEFAULTS: Readonly<Settings> = Object.freeze({ ziHour: '23:00', termSwitch: 'exact' });

export interface EarthStem {
  stem: Stem;
  /** 击刑: drawn purple */
  jiXing: boolean;
  /** 入墓: drawn green */
  ruMu: boolean;
}

export interface HeavenStem extends EarthStem {
  /** 日干: drawn inside a square */
  riGan: boolean;
}

export interface Palace {
  /** 八神: 值符 … 九天 */
  god: string;
  /** 九星: 天蓬 … 天心, or 芮禽 */
  star: string;
  /** 八门: 休门 … 开门 */
  door: string;
  /** 门迫: the door is drawn red */
  menPo: boolean;
  /** 天盘: one stem, or two where 芮禽 sits (中5's stem first) */
  heaven: HeavenStem[];
  /** 地盘: one stem, or two in 坤2 (中5's stem first) */
  earth: EarthStem[];
  /** 十二长生 labels: one group per 天盘 stem, one character per palace branch, e.g. ['养长', '冠沐'] */
  heavenStages: string[];
  earthStages: string[];
  /** 空亡: ○ */
  kongWang: boolean;
  /** 马星: ♞ */
  horse: boolean;
  /** 100, 50, 25, 12.5 or 6.25 */
  score: number;
}

export interface Chart {
  header: {
    /** 阳历: '1996-06-20 18:16:00' */
    solar: string;
    /** 阴历: '丙子年 五月初五' */
    lunar: string;
    /** 四柱: '丙子', '甲午', '戊子', '辛酉' */
    pillars: { year: string; month: string; day: string; hour: string };
    /** 选局: '阳遁3局' */
    ju: string;
    /** 旬首: '甲寅癸' */
    xunShou: string;
    /** 值符: '天任'. With the 旬首 in 坤2 it is '天芮', in 中5 '芮禽'. */
    zhiFu: string;
    /** 值使: '生门' */
    zhiShi: string;
    /** 局式: '转盘-拆补-寄坤二宫' */
    juShi: string;
  };
  jieqi: {
    current: string;
    /** 'YYYY-MM-DD HH:mm:ss', Beijing time */
    currentStart: string;
    next: string;
    nextStart: string;
    yuan: '上元' | '中元' | '下元';
    fuTou: string;
  };
  derived: {
    dun: '阳' | '阴';
    juNumber: number;
    zhiFuPalace: PalaceNo;
    zhiShiPalace: PalaceNo;
    kongWangBranches: string[];
    horseBranch: string;
  };
  /** 中5's 地盘 stem */
  center: Stem;
  palaces: Record<PalaceNo, Palace>;
}

// ── The tables (SPEC §6) ─────────────────────────────────────────────────────────────────────────────────────

export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

/** The 60 干支 pairs in cycle order: 甲子, 乙丑 … 癸亥. */
export const SIXTY: readonly string[] = Array.from({ length: 60 }, (_, n) => STEMS[n % 10] + BRANCHES[n % 12]);

/** 三奇六仪, in the order they are laid on the 地盘 (step 5). */
export const QIYI: readonly Stem[] = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

/** The outer palaces clockwise on the south-up grid, from 坎1: the order every rotation follows. */
export const RING: readonly PalaceNo[] = [1, 8, 3, 4, 9, 2, 7, 6];

/** The nine palaces as drawn, south up. */
export const GRID = [
  4, 9, 2,
  3, 5, 7,
  8, 1, 6,
] as const;

interface PalaceRow {
  trigram: string;
  element: WuXing;
  /** Left to right as they sit on the grid, which is also the order of the 长生 labels */
  branches: string;
  /** Home star */
  star: string;
  /** Home door. A door has the element of its home palace. */
  door: string;
}

/**
 * Each outer palace, in ring order. 中5 has no row: its star, 天禽, always travels with 坤2's 天芮 (the pair is
 * printed 芮禽), and it borrows 坤2's door.
 */
export const PALACE: Readonly<Record<PalaceNo, PalaceRow>> = {
  1: { trigram: '坎', element: '水', branches: '子', star: '天蓬', door: '休门' },
  8: { trigram: '艮', element: '土', branches: '寅丑', star: '天任', door: '生门' },
  3: { trigram: '震', element: '木', branches: '卯', star: '天冲', door: '伤门' },
  4: { trigram: '巽', element: '木', branches: '辰巳', star: '天辅', door: '杜门' },
  9: { trigram: '离', element: '火', branches: '午', star: '天英', door: '景门' },
  2: { trigram: '坤', element: '土', branches: '未申', star: '天芮', door: '死门' },
  7: { trigram: '兑', element: '金', branches: '酉', star: '天柱', door: '惊门' },
  6: { trigram: '乾', element: '金', branches: '亥戌', star: '天心', door: '开门' },
};

/** Each element overcomes the one it maps to: 木克土, 土克水, 水克火, 火克金, 金克木. */
export const KE: Readonly<Record<WuXing, WuXing>> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 八神, in order from 值符. */
export const GODS: readonly string[] = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

/** 局 table (拆补法): each 节气's 局 for 上元, 中元, 下元. 冬至 through 芒种 are 阳遁, 夏至 through 大雪 阴遁. */
export const JU: Readonly<Record<'阳' | '阴', Readonly<Record<string, readonly number[]>>>> = {
  阳: {
    冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2], 雨水: [9, 6, 3], 惊蛰: [1, 7, 4],
    春分: [3, 9, 6], 清明: [4, 1, 7], 谷雨: [5, 2, 8], 立夏: [4, 1, 7], 小满: [5, 2, 8], 芒种: [6, 3, 9],
  },
  阴: {
    夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4], 立秋: [2, 5, 8], 处暑: [1, 4, 7], 白露: [9, 3, 6],
    秋分: [7, 1, 4], 寒露: [6, 9, 3], 霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1],
  },
};

/** 元, in the order the 局 table lists them, each with the 符头 branches that give it. */
export const YUAN = [
  { name: '上元', branches: '子午卯酉' },
  { name: '中元', branches: '寅申巳亥' },
  { name: '下元', branches: '辰戌丑未' },
] as const;

/** The six 旬 in cycle order: the 仪 that hides each one's 甲, and the two 空亡 branches it skips. */
export const XUN = [
  { head: '甲子', yi: '戊', kong: '戌亥' },
  { head: '甲戌', yi: '己', kong: '申酉' },
  { head: '甲申', yi: '庚', kong: '午未' },
  { head: '甲午', yi: '辛', kong: '辰巳' },
  { head: '甲辰', yi: '壬', kong: '寅卯' },
  { head: '甲寅', yi: '癸', kong: '子丑' },
] as const;

/** 驿马 from the hour branch: 申子辰 → 寅, 寅午戌 → 申, 巳酉丑 → 亥, 亥卯未 → 巳. */
export const HORSE: Readonly<Record<string, string>> = {
  申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳',
};

/** 击刑: the palace where each stem is 击刑. */
export const JI_XING: Readonly<Partial<Record<Stem, PalaceNo>>> = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 };

/** 入墓: the palace where each stem is in its tomb. 甲 is never displayed. */
export const RU_MU: Readonly<Partial<Record<Stem, PalaceNo>>> = {
  乙: 6, 丙: 6, 丁: 8, 戊: 6, 己: 8, 庚: 8, 辛: 4, 壬: 4, 癸: 2,
};

/** Each stem's 长生 branch. 戊 follows 丙 and 己 follows 丁. */
export const CHANG_SHENG: Readonly<Record<Stem, string>> = {
  甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯',
};

/** 十二长生 as the grid labels them: 长生 沐浴 冠带 临官 帝旺 衰 病 死 墓 绝 胎 养. */
export const STAGES = '长沐冠临旺衰病死墓绝胎养';

// ── Reading a time ───────────────────────────────────────────────────────────────────────────────────────────

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

/** Days in a 公历 month. */
export function daysInMonth(year: number, month: number): number {
  const leapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return month === 2 && leapYear ? 29 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Whether the input is a real minute from 1900-01-01 00:00 to 2100-12-31 23:59. */
function isRealMinute({ year, month, day, hour, minute }: ChartInput): boolean {
  return (
    [year, month, day, hour, minute].every(Number.isInteger) &&
    year >= MIN_YEAR && year <= MAX_YEAR &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= daysInMonth(year, month) &&
    hour >= 0 && hour <= 23 &&
    minute >= 0 && minute <= 59
  );
}

/**
 * Reads 'YYYY-MM-DDTHH:mm', the way the app and the golden charts write a time down. Null unless it is a real
 * minute from 1900 to 2100.
 */
export function parseInput(text: string): ChartInput | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const input = { year, month, day, hour, minute };
  return isRealMinute(input) ? input : null;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** The input as 'YYYY-MM-DDTHH:mm'. */
export const formatInput = ({ year, month, day, hour, minute }: ChartInput): string =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;

// ── The twelve steps (SPEC §5) ───────────────────────────────────────────────────────────────────────────────

/** a mod n, never negative (JS `%` keeps the dividend's sign). */
const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** k steps from palace p through 1–9, 5 included, wrapping between 9 and 1. */
const walk = (p: number, k: number): number => mod(p - 1 + k, 9) + 1;

/** 中5 lodges in 坤2. */
const lodge = (p: number): PalaceNo => (p === 5 ? 2 : p) as PalaceNo;

/** The ring after turning k places clockwise: what stood at place i now stands at i + k. */
const turned = <T>(ring: readonly T[], k: number): T[] => ring.map((_, i) => ring[mod(i - k, 8)]);

/**
 * A stem's 十二长生 stage at a branch, 0 = 长生 … 11 = 养: counted from its 长生 branch, forward through 子丑寅… for
 * yang stems and backward for yin stems.
 */
export function stageAt(stem: Stem, branch: string): number {
  const from = BRANCHES.indexOf(CHANG_SHENG[stem]);
  const to = BRANCHES.indexOf(branch);
  const yang = STEMS.indexOf(stem) % 2 === 0;
  return mod(yang ? to - from : from - to, 12);
}

/** The 24 节气, as the 局 table names them. */
const JIEQI: readonly string[] = [...Object.keys(JU.阳), ...Object.keys(JU.阴)];

/** A 节气 name from lunar-typescript, checked against the 局 table's. */
function jieQiName(name: string): string {
  if (!JIEQI.includes(name)) throw new Error(`unexpected 节气 name from lunar-typescript: ${name}`);
  return name;
}

export function castChart(input: ChartInput, settings: Settings = DEFAULTS): Chart {
  if (!isRealMinute(input)) {
    throw new RangeError(`not a real minute from ${MIN_YEAR} to ${MAX_YEAR}: ${JSON.stringify(input)}`);
  }
  const { year, month, day, hour, minute } = input;
  // The settings as shipped: a 节气 takes effect at its own minute, and the day changes at 23:00.
  const wholeDay = settings.termSwitch === 'day';
  const dayFrom23 = settings.ziHour === '23:00';

  // 1. Time basis. The time is read as given, as Beijing time: no time-zone conversion, no DST removal, no
  //    真太阳时.
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();

  // 2. Calendar. 年柱 switches at 立春 and 月柱 at each 节. 时柱 runs in two-hour branches from 23:00.
  const pillars = {
    year: wholeDay ? lunar.getYearInGanZhiByLiChun() : lunar.getYearInGanZhiExact(),
    month: wholeDay ? lunar.getMonthInGanZhi() : lunar.getMonthInGanZhiExact(),
    day: dayFrom23 ? lunar.getDayInGanZhiExact() : lunar.getDayInGanZhiExact2(),
    hour: lunar.getTimeInGanZhi(),
  };

  // 3. 节气, 符头, 元. The 节气 is the latest of the 24 at or before the time. The 符头 is the latest 甲 or 己 day
  //    on or before the 日柱, and its branch gives the 元.
  const term = lunar.getPrevJieQi(wholeDay);
  const nextTerm = lunar.getNextJieQi(wholeDay);
  const termName = jieQiName(term.getName());
  const nextName = jieQiName(nextTerm.getName());
  const dayIndex = SIXTY.indexOf(pillars.day);
  const fuTou = SIXTY[dayIndex - (dayIndex % 5)];
  const yuan = YUAN.findIndex((y) => y.branches.includes(fuTou[1]));

  // 4. 局 (拆补法): 阴 or 阳 and a number, from the 节气 and the 元.
  const dun = termName in JU.阳 ? '阳' : '阴';
  const ju = JU[dun][termName][yuan];
  // 阳遁 counts up through the palaces and goes clockwise round the ring; 阴遁 counts down and goes
  // counterclockwise.
  const dir = dun === '阳' ? 1 : -1;

  // 5. 地盘: 戊己庚辛壬癸丁丙乙, one per palace, from the palace numbered by the 局 through 1–9 (5 included).
  //    中5's stem is also shown in 坤2, in front of 坤2's own.
  const earth: Stem[] = []; // earth[p] is the stem of palace p, 1–9
  QIYI.forEach((stem, i) => (earth[walk(ju, dir * i)] = stem));
  const earthStems = (p: PalaceNo): Stem[] => (p === 2 ? [earth[5], earth[2]] : [earth[p]]);

  // 6. 旬首, 值符, 值使. The hour's 旬 hides its 甲 under a 仪. P0 is the palace holding that 仪 on the 地盘: its
  //    home star is the 值符 and its home door the 值使. When P0 is 中5, both turn from 坤2.
  const hourIndex = SIXTY.indexOf(pillars.hour);
  const xun = XUN[Math.floor(hourIndex / 10)];
  const p0 = earth.indexOf(xun.yi);
  const home = lodge(p0);

  // 7. 天盘 (转盘). The eight stars turn as one rigid ring until the 值符 stands over the hour stem on the 地盘
  //    (a 甲 hour uses the 旬's 仪), the same way in 阴遁 and 阳遁. Each star carries its home palace's stems.
  const hourStem = pillars.hour[0] === '甲' ? xun.yi : (pillars.hour[0] as Stem);
  const target = lodge(earth.indexOf(hourStem));
  /** starFrom[i]: the home palace of the star now in palace RING[i] */
  const starFrom = turned(RING, RING.indexOf(target) - RING.indexOf(home));

  // 8. 八门. The 值使 walks from P0 (中5 allowed) one palace for each hour into the 旬, through 1–9; landing on
  //    中5 means 坤2. The eight doors turn as one rigid ring until the 值使 stands there.
  const doorPalace = lodge(walk(p0, dir * (hourIndex % 10)));
  /** doorFrom[i]: the home palace of the door now in palace RING[i] */
  const doorFrom = turned(RING, RING.indexOf(doorPalace) - RING.indexOf(home));

  // 9. 八神: 值符 over the hour stem, the others following round the ring.
  const gods = RING.map((_, i) => GODS[mod(dir * (i - RING.indexOf(target)), 8)]);

  // 10. 空亡 and 马星 mark the palaces that hold the 旬's two skipped branches and the hour's 驿马 branch.
  const horseBranch = HORSE[pillars.hour[1]];

  // 11–12. Each palace: its stems' flags and 长生 labels, 门迫, and the score.
  const palaces = {} as Record<PalaceNo, Palace>;
  RING.forEach((p, i) => {
    const { branches, element } = PALACE[p];
    // 击刑 and 入墓 are judged in the palace where the stem is displayed.
    const flags = (stem: Stem): EarthStem => ({ stem, jiXing: JI_XING[stem] === p, ruMu: RU_MU[stem] === p });
    const stages = (stem: Stem): string => [...branches].map((b) => STAGES[stageAt(stem, b)]).join('');

    // 日干: 甲 never shows on the 天盘, so a 甲 day has no square.
    const heaven = earthStems(starFrom[i]).map((stem) => ({ ...flags(stem), riGan: stem === pillars.day[0] }));
    const kongWang = [...xun.kong].some((b) => branches.includes(b));
    const menPo = KE[PALACE[doorFrom[i]].element] === element;
    // The score halves for 空亡, for 门迫, and for each 击刑 and 入墓 among the 天盘 stems. 地盘 flags, 马星 and
    // 日干 don't count.
    const n = Number(kongWang) + Number(menPo) + heaven.reduce((sum, s) => sum + Number(s.jiXing) + Number(s.ruMu), 0);

    palaces[p] = {
      god: gods[i],
      star: starFrom[i] === 2 ? '芮禽' : PALACE[starFrom[i]].star,
      door: PALACE[doorFrom[i]].door,
      menPo,
      heaven,
      earth: earthStems(p).map(flags),
      heavenStages: heaven.map((s) => stages(s.stem)),
      earthStages: earthStems(p).map(stages),
      kongWang,
      horse: branches.includes(horseBranch),
      score: 100 / 2 ** n,
    };
  });

  return {
    header: {
      solar: `${pad(year, 4)}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`,
      lunar: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      pillars,
      ju: `${dun}遁${ju}局`,
      xunShou: xun.head + xun.yi,
      zhiFu: p0 === 5 ? '芮禽' : PALACE[home].star,
      zhiShi: PALACE[home].door,
      juShi: '转盘-拆补-寄坤二宫',
    },
    jieqi: {
      current: termName,
      currentStart: term.getSolar().toYmdHms(),
      next: nextName,
      nextStart: nextTerm.getSolar().toYmdHms(),
      yuan: YUAN[yuan].name,
      fuTou,
    },
    derived: {
      dun,
      juNumber: ju,
      zhiFuPalace: target,
      zhiShiPalace: doorPalace,
      kongWangBranches: [...xun.kong],
      horseBranch,
    },
    center: earth[5],
    palaces,
  };
}
