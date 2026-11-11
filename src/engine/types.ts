// Types shared by the engine and the UI (SPEC §7). Every value is the Chinese term the chart shows.

export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** Outer palaces. 中5 is `Chart.center`. */
export type PalaceNo = 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9;
/** Any of the nine palaces, counting 中5. */
export type LuoShuNo = PalaceNo | 5;

export type Element = '木' | '火' | '土' | '金' | '水';
export type Trigram = '坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑' | '乾';
export type Dun = '阳' | '阴';
export type Yuan = '上元' | '中元' | '下元';

export type JieQiName =
  | '冬至' | '小寒' | '大寒' | '立春' | '雨水' | '惊蛰' | '春分' | '清明' | '谷雨' | '立夏' | '小满' | '芒种'
  | '夏至' | '小暑' | '大暑' | '立秋' | '处暑' | '白露' | '秋分' | '寒露' | '霜降' | '立冬' | '小雪' | '大雪';

export type Star = '天蓬' | '天任' | '天冲' | '天辅' | '天英' | '天芮' | '天柱' | '天心' | '天禽';
/** What a palace shows: 天禽 always travels with 天芮, printed 芮禽. */
export type StarLabel = Exclude<Star, '天芮' | '天禽'> | '芮禽';
export type Door = '休门' | '生门' | '伤门' | '杜门' | '景门' | '死门' | '惊门' | '开门';
export type God = '值符' | '腾蛇' | '太阴' | '六合' | '白虎' | '玄武' | '九地' | '九天';

/** Beijing wall-clock time, minute precision. */
export interface ChartInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * `castChart`'s settings (SPEC §7). The four fixed settings have one value each in v1; each is a parameter so a
 * later option only widens its type. The two calendar conventions are the defaults for open questions Q1–Q3.
 */
export interface Settings {
  /** 排盘方式 */
  method: '转盘';
  /** 定局 */
  dingJu: '拆补';
  /** 标记旬空 */
  kongWang: '时空';
  /** 中宫寄宫 */
  centerLodge: '寄坤二宫';
  /** Q1: '23:00' puts 23:00–23:59 on the next day's 日柱; '00:00' keeps it on the calendar day. */
  ziHour: '23:00' | '00:00';
  /** Q2, Q3: 年柱, 月柱 and the 节气 switch at the exact 节气 instant ('exact') or at 00:00 of that day ('day'). */
  termSwitch: 'exact' | 'day';
}

export interface HeavenStem {
  stem: Stem;
  jiXing: boolean;
  ruMu: boolean;
  riGan: boolean;
}

export interface EarthStem {
  stem: Stem;
  jiXing: boolean;
  ruMu: boolean;
}

export interface Palace {
  god: God;
  star: StarLabel;
  door: Door;
  menPo: boolean;
  /** 1 stem, or 2 where 芮禽 sits (中5 stem first). */
  heaven: HeavenStem[];
  /** 1 stem, or 2 in palace 2 (中5 stem first). */
  earth: EarthStem[];
  /** One label group per heaven stem, one character per palace branch, e.g. ['养长', '冠沐']. */
  heavenStages: string[];
  earthStages: string[];
  /** ○ */
  kongWang: boolean;
  /** ♞ */
  horse: boolean;
  /** 100, 50, 25, 12.5 or 6.25 */
  score: number;
}

export interface Pillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface JieQiInfo {
  current: JieQiName;
  /** 'YYYY-MM-DD HH:mm:ss', Beijing time */
  currentStart: string;
  next: JieQiName;
  nextStart: string;
  yuan: Yuan;
  fuTou: string;
}

export interface Chart {
  header: {
    /** '1996-06-20 18:16:00' */
    solar: string;
    /** '丙子年 五月初五' */
    lunar: string;
    pillars: Pillars;
    /** '阳遁3局' */
    ju: string;
    /** '甲寅癸' */
    xunShou: string;
    /** The 值符 star: '天任', '天芮' (旬首 in 坤2) or '芮禽' (旬首 in 中5). */
    zhiFu: Exclude<Star, '天禽'> | '芮禽';
    zhiShi: Door;
    /** '转盘-拆补-寄坤二宫' */
    juShi: string;
  };
  jieqi: JieQiInfo;
  derived: {
    dun: Dun;
    juNumber: number;
    zhiFuPalace: PalaceNo;
    zhiShiPalace: PalaceNo;
    kongWangBranches: Branch[];
    horseBranch: Branch;
  };
  /** 中5 地盘 stem */
  center: Stem;
  palaces: Record<PalaceNo, Palace>;
}
