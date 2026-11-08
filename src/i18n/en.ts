// English UI strings (SPEC §4) and glossary (SPEC §6), keyed by the engine's Chinese IDs.
import type { Branch, Door, God, JieQiName, Star, StarLabel, Stem, Trigram, Yuan } from '../engine';
import type { UiKey } from './zh';

export const en: Readonly<Record<UiKey, string>> = {
  'app.title': 'Qi Men Chart',
  'input.date': 'Date & time',
  'input.method': 'Plate',
  'input.method.value': 'Rotating',
  'input.dingju': 'Structure method',
  'input.dingju.value': 'Chai Bu',
  'input.void': 'Void marking',
  'input.void.value': 'Hour void',
  'input.lodge': 'Center lodging',
  'input.lodge.value': 'Kun 2',
  'input.cast': 'Cast chart',
  'input.reset': 'Reset to now',
  'chart.back': 'Back',
  'chart.title': 'Chart',
  'chart.solar': 'Solar',
  'chart.lunar': 'Lunar',
  'chart.year': 'Year',
  'chart.month': 'Month',
  'chart.day': 'Day',
  'chart.hour': 'Hour',
  'chart.ju': 'Structure',
  'chart.xun': 'Xun Head',
  'chart.zhifu': 'Chief Symbol',
  'chart.zhishi': 'Chief Gate',
  'chart.jushi': 'Method',
  'chart.terms.show': 'Show solar terms',
  'chart.terms.hide': 'Hide solar terms',
  'terms.current': 'Current term',
  'terms.next': 'Next term',
  'terms.yuan': 'Yuan',
  'terms.futou': 'Fu Tou',
  footer: 'For entertainment only. Please view it objectively and scientifically, and reject superstition.',
  colon: ':',
  'lang.label': 'Language',
};

export const STEM_EN: Readonly<Record<Stem, string>> = {
  甲: 'Jia', 乙: 'Yi', 丙: 'Bing', 丁: 'Ding', 戊: 'Wu', 己: 'Ji', 庚: 'Geng', 辛: 'Xin', 壬: 'Ren', 癸: 'Gui',
};

export const BRANCH_EN: Readonly<Record<Branch, string>> = {
  子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si', 午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai',
};

/** grid: the short label inside a palace; full: everywhere else. */
export interface Names {
  grid: string;
  full: string;
}

export const STAR_EN: Readonly<Record<Star | StarLabel, Names>> = {
  天蓬: { grid: 'Peng', full: 'Tian Peng' },
  天任: { grid: 'Ren', full: 'Tian Ren' },
  天冲: { grid: 'Chong', full: 'Tian Chong' },
  天辅: { grid: 'Fu', full: 'Tian Fu' },
  天英: { grid: 'Ying', full: 'Tian Ying' },
  天芮: { grid: 'Rui', full: 'Tian Rui' },
  芮禽: { grid: 'Rui·Qin', full: 'Tian Rui (with Tian Qin)' },
  天柱: { grid: 'Zhu', full: 'Tian Zhu' },
  天心: { grid: 'Xin', full: 'Tian Xin' },
  天禽: { grid: 'Qin', full: 'Tian Qin' },
};

export const DOOR_EN: Readonly<Record<Door, Names>> = {
  休门: { grid: 'Rest', full: 'Rest Gate' },
  生门: { grid: 'Life', full: 'Life Gate' },
  伤门: { grid: 'Harm', full: 'Harm Gate' },
  杜门: { grid: 'Block', full: 'Block Gate' },
  景门: { grid: 'Scenery', full: 'Scenery Gate' },
  死门: { grid: 'Death', full: 'Death Gate' },
  惊门: { grid: 'Shock', full: 'Shock Gate' },
  开门: { grid: 'Open', full: 'Open Gate' },
};

export const GOD_EN: Readonly<Record<God, Names>> = {
  值符: { grid: 'Chief', full: 'Chief Symbol' },
  腾蛇: { grid: 'Serpent', full: 'Serpent' },
  太阴: { grid: 'Grand Yin', full: 'Grand Yin' },
  六合: { grid: 'Harmony', full: 'Six Harmony' },
  白虎: { grid: 'Tiger', full: 'White Tiger' },
  玄武: { grid: 'Tortoise', full: 'Black Tortoise' },
  九地: { grid: '9 Earth', full: 'Nine Earth' },
  九天: { grid: '9 Heaven', full: 'Nine Heaven' },
};

export const JIEQI_EN: Readonly<Record<JieQiName, string>> = {
  冬至: 'Winter Solstice', 小寒: 'Minor Cold', 大寒: 'Major Cold', 立春: 'Start of Spring', 雨水: 'Rain Water',
  惊蛰: 'Awakening of Insects', 春分: 'Spring Equinox', 清明: 'Pure Brightness', 谷雨: 'Grain Rain',
  立夏: 'Start of Summer', 小满: 'Grain Buds', 芒种: 'Grain in Ear', 夏至: 'Summer Solstice', 小暑: 'Minor Heat',
  大暑: 'Major Heat', 立秋: 'Start of Autumn', 处暑: 'End of Heat', 白露: 'White Dew', 秋分: 'Autumn Equinox',
  寒露: 'Cold Dew', 霜降: "Frost's Descent", 立冬: 'Start of Winter', 小雪: 'Minor Snow', 大雪: 'Major Snow',
};

export const YUAN_EN: Readonly<Record<Yuan, string>> = { 上元: 'Upper', 中元: 'Middle', 下元: 'Lower' };

export const TRIGRAM_EN: Readonly<Record<Trigram, string>> = {
  乾: '☰', 兑: '☱', 离: '☲', 震: '☳', 巽: '☴', 坎: '☵', 艮: '☶', 坤: '☷',
};

/** The parts of 局式 ('转盘-拆补-寄坤二宫'). */
export const JUSHI_EN: Readonly<Record<string, string>> = { 转盘: 'Rotating', 拆补: 'Chai Bu', 寄坤二宫: 'Center in Kun 2' };
