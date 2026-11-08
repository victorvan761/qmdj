// Every constant from SPEC §6, as Chinese IDs. English names live in src/i18n.
import type {
  Branch, Door, Dun, Element, God, JieQiName, LuoShuNo, PalaceNo, Star, Stem, Trigram, Yuan,
} from './types';

export const STEMS: readonly Stem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES: readonly Branch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 三奇六仪, in the order they are laid on the 地盘 (step 5). */
export const QIYI: readonly Stem[] = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

/** Outer palaces clockwise on the south-up grid: the order every rotation follows. */
export const RING: readonly PalaceNo[] = [1, 8, 3, 4, 9, 2, 7, 6];

/** The grid as drawn, south up: 巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6. */
export const GRID: readonly (readonly LuoShuNo[])[] = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

export const TRIGRAM: Readonly<Record<PalaceNo, Trigram>> = {
  1: '坎', 8: '艮', 3: '震', 4: '巽', 9: '离', 2: '坤', 7: '兑', 6: '乾',
};

export const PALACE_ELEMENT: Readonly<Record<PalaceNo, Element>> = {
  1: '水', 8: '土', 3: '木', 4: '木', 9: '火', 2: '土', 7: '金', 6: '金',
};

/** Each palace's branches, left to right as they sit on the grid; also the order of the 长生 labels. */
export const PALACE_BRANCHES: Readonly<Record<PalaceNo, readonly Branch[]>> = {
  1: ['子'], 8: ['寅', '丑'], 3: ['卯'], 4: ['辰', '巳'], 9: ['午'], 2: ['未', '申'], 7: ['酉'], 6: ['亥', '戌'],
};

export const BRANCH_PALACE: Readonly<Record<Branch, PalaceNo>> = {
  子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4, 午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6,
};

export const HOME_STAR: Readonly<Record<LuoShuNo, Star>> = {
  1: '天蓬', 8: '天任', 3: '天冲', 4: '天辅', 9: '天英', 2: '天芮', 7: '天柱', 6: '天心', 5: '天禽',
};

/** 中5 has no door of its own; it uses 坤2's 死门. */
export const HOME_DOOR: Readonly<Record<PalaceNo, Door>> = {
  1: '休门', 8: '生门', 3: '伤门', 4: '杜门', 9: '景门', 2: '死门', 7: '惊门', 6: '开门',
};

export const DOOR_ELEMENT: Readonly<Record<Door, Element>> = {
  休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金',
};

/** X overcomes KE[X]: 木克土, 土克水, 水克火, 火克金, 金克木. */
export const KE: Readonly<Record<Element, Element>> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 八神, in order from 值符. */
export const GODS: readonly God[] = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

/** The 24 节气 from 冬至, in the order of the 局 table. */
export const JIEQI: readonly JieQiName[] = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种',
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
];

/** 局 table (拆补法): each 节气's 遁 and its 局 numbers for 上元, 中元, 下元. */
export const JU: Readonly<Record<JieQiName, { dun: Dun; ju: readonly [number, number, number] }>> = {
  冬至: { dun: '阳', ju: [1, 7, 4] }, 小寒: { dun: '阳', ju: [2, 8, 5] }, 大寒: { dun: '阳', ju: [3, 9, 6] },
  立春: { dun: '阳', ju: [8, 5, 2] }, 雨水: { dun: '阳', ju: [9, 6, 3] }, 惊蛰: { dun: '阳', ju: [1, 7, 4] },
  春分: { dun: '阳', ju: [3, 9, 6] }, 清明: { dun: '阳', ju: [4, 1, 7] }, 谷雨: { dun: '阳', ju: [5, 2, 8] },
  立夏: { dun: '阳', ju: [4, 1, 7] }, 小满: { dun: '阳', ju: [5, 2, 8] }, 芒种: { dun: '阳', ju: [6, 3, 9] },
  夏至: { dun: '阴', ju: [9, 3, 6] }, 小暑: { dun: '阴', ju: [8, 2, 5] }, 大暑: { dun: '阴', ju: [7, 1, 4] },
  立秋: { dun: '阴', ju: [2, 5, 8] }, 处暑: { dun: '阴', ju: [1, 4, 7] }, 白露: { dun: '阴', ju: [9, 3, 6] },
  秋分: { dun: '阴', ju: [7, 1, 4] }, 寒露: { dun: '阴', ju: [6, 9, 3] }, 霜降: { dun: '阴', ju: [5, 8, 2] },
  立冬: { dun: '阴', ju: [6, 9, 3] }, 小雪: { dun: '阴', ju: [5, 8, 2] }, 大雪: { dun: '阴', ju: [4, 7, 1] },
};

export const YUAN: readonly Yuan[] = ['上元', '中元', '下元'];

/** 元 from the 符头's branch: 子午卯酉 上元, 寅申巳亥 中元, 辰戌丑未 下元. */
export const YUAN_BY_BRANCH: Readonly<Record<Branch, Yuan>> = {
  子: '上元', 午: '上元', 卯: '上元', 酉: '上元',
  寅: '中元', 申: '中元', 巳: '中元', 亥: '中元',
  辰: '下元', 戌: '下元', 丑: '下元', 未: '下元',
};

/** The six 旬 in cycle order: the hidden 甲's 仪 and the two 空亡 branches the 旬 skips. */
export const XUN: readonly { head: string; yi: Stem; kong: readonly [Branch, Branch] }[] = [
  { head: '甲子', yi: '戊', kong: ['戌', '亥'] },
  { head: '甲戌', yi: '己', kong: ['申', '酉'] },
  { head: '甲申', yi: '庚', kong: ['午', '未'] },
  { head: '甲午', yi: '辛', kong: ['辰', '巳'] },
  { head: '甲辰', yi: '壬', kong: ['寅', '卯'] },
  { head: '甲寅', yi: '癸', kong: ['子', '丑'] },
];

/** 驿马 from the hour branch: 申子辰 → 寅, 寅午戌 → 申, 巳酉丑 → 亥, 亥卯未 → 巳. */
export const HORSE: Readonly<Record<Branch, Branch>> = {
  申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳',
};

/** 击刑: the palace in which each stem is 击刑. */
export const JI_XING: Readonly<Partial<Record<Stem, PalaceNo>>> = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 };

/** 入墓: the palace in which each stem is in its tomb. 甲 is never displayed. */
export const RU_MU: Readonly<Partial<Record<Stem, PalaceNo>>> = {
  乙: 6, 丙: 6, 丁: 8, 戊: 6, 己: 8, 庚: 8, 辛: 4, 壬: 4, 癸: 2,
};

/** Each stem's 长生 branch. Yang stems (甲丙戊庚壬) count forward from it, yin stems backward. */
export const CHANG_SHENG: Readonly<Record<Stem, Branch>> = {
  甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯',
};

export const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;
/** The one-character labels printed in the grid. */
export const STAGE_LABELS = ['长', '沐', '冠', '临', '旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;

/** a mod n, never negative (JS `%` keeps the dividend's sign). */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Position of a 干支 pair in the 60-cycle (甲子 = 0). */
export function ganZhiIndex(gz: string): number {
  const s = STEMS.indexOf(gz[0] as Stem);
  const b = BRANCHES.indexOf(gz[1] as Branch);
  if (s < 0 || b < 0 || s % 2 !== b % 2) throw new Error(`not a 干支 pair: ${gz}`);
  return mod(6 * s - 5 * b, 60);
}

/** The 干支 pair at position n of the 60-cycle. */
export const ganZhiAt = (n: number): string => STEMS[mod(n, 10)] + BRANCHES[mod(n, 12)];

/** A stem's 十二长生 stage at a branch: 0 = 长生 … 11 = 养. */
export function stageAt(stem: Stem, branch: Branch): number {
  const start = BRANCHES.indexOf(CHANG_SHENG[stem]);
  const b = BRANCHES.indexOf(branch);
  const yang = STEMS.indexOf(stem) % 2 === 0;
  return yang ? mod(b - start, 12) : mod(start - b, 12);
}
