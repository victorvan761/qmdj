// Render-time translation (SPEC §4): UI strings, the glossary and the composite formats. The engine stays
// language-neutral; everything here is a pure function of an engine value and the language.
import type { Branch, Chart, ChartInput, Door, God, JieQiName, Star, StarLabel, Stem, Trigram, Yuan } from '../engine';
import { BRANCH_EN, DOOR_EN, GOD_EN, JIEQI_EN, JUSHI_EN, STAR_EN, STEM_EN, TRIGRAM_EN, YUAN_EN, en } from './en';
import { ZH_DISPLAY, zh, type UiKey } from './zh';

export type { UiKey } from './zh';
export type Lang = 'zh' | 'en';
export const LANGS: readonly Lang[] = ['zh', 'en'];
export const isLang = (v: unknown): v is Lang => v === 'zh' || v === 'en';

/** Grid labels are the short forms used inside a palace; 'full' is for everywhere else. */
export type Form = 'grid' | 'full';

export const t = (lang: Lang, key: UiKey): string => (lang === 'zh' ? zh : en)[key];

export const stem = (lang: Lang, s: Stem): string => (lang === 'zh' ? s : STEM_EN[s]);
export const branch = (lang: Lang, b: Branch): string => (lang === 'zh' ? b : BRANCH_EN[b]);
export const ganZhi = (lang: Lang, gz: string): string =>
  lang === 'zh' ? gz : `${STEM_EN[gz[0] as Stem]} ${BRANCH_EN[gz[1] as Branch]}`;
export const star = (lang: Lang, s: Star | StarLabel, form: Form): string => (lang === 'zh' ? s : STAR_EN[s][form]);
export const door = (lang: Lang, d: Door, form: Form): string => (lang === 'zh' ? d : DOOR_EN[d][form]);
export const god = (lang: Lang, g: God, form: Form): string => (lang === 'zh' ? (ZH_DISPLAY[g] ?? g) : GOD_EN[g][form]);
export const jieqi = (lang: Lang, j: JieQiName): string => (lang === 'zh' ? j : JIEQI_EN[j]);
export const yuan = (lang: Lang, y: Yuan): string => (lang === 'zh' ? y : YUAN_EN[y]);
export const trigram = (lang: Lang, g: Trigram): string => (lang === 'zh' ? g : TRIGRAM_EN[g]);

/** Between the two stems of a two-stem slot: 庚乙 / Geng·Yi. */
export const stemJoiner = (lang: Lang): string => (lang === 'zh' ? '' : '·');
export const stemsText = (lang: Lang, stems: readonly Stem[]): string =>
  stems.map((s) => stem(lang, s)).join(stemJoiner(lang));

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** The date picker: 1996年/06月/20日 18:20 / 1996-06-20 18:20. */
export function pickerDate(lang: Lang, i: ChartInput): string {
  const [y, mo, d, h, mi] = [pad(i.year, 4), pad(i.month), pad(i.day), pad(i.hour), pad(i.minute)];
  return lang === 'zh' ? `${y}年/${mo}月/${d}日 ${h}:${mi}` : `${y}-${mo}-${d} ${h}:${mi}`;
}

/** 阴历: 丙子年 五月初五 / Bing Zi year · month 5 · day 5 (leap: leap month 6). */
export function lunarText(lang: Lang, chart: Chart): string {
  if (lang === 'zh') return chart.header.lunar;
  const { yearGanZhi, month, leap, day } = chart.lunarParts;
  return `${ganZhi('en', yearGanZhi)} year · ${leap ? 'leap ' : ''}month ${month} · day ${day}`;
}

/** 选局: 阳遁3局 / Yang Dun 3. */
export const juText = (lang: Lang, chart: Chart): string =>
  lang === 'zh' ? chart.header.ju : `${chart.derived.dun === '阳' ? 'Yang' : 'Yin'} Dun ${chart.derived.juNumber}`;

/** 旬首: 甲寅癸 / Jia Yin · Gui. */
export function xunText(lang: Lang, chart: Chart): string {
  const x = chart.header.xunShou;
  return lang === 'zh' ? x : `${ganZhi('en', x.slice(0, 2))} · ${STEM_EN[x[2] as Stem]}`;
}

/** 局式: 转盘-拆补-寄坤二宫 / Rotating · Chai Bu · Center in Kun 2. */
export const juShiText = (lang: Lang, chart: Chart): string =>
  lang === 'zh' ? chart.header.juShi : chart.header.juShi.split('-').map((part) => JUSHI_EN[part] ?? part).join(' · ');
