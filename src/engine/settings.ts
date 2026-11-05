import type { Settings } from './types';

/** The settings that reproduce 玄天排盘 (SPEC §1, §9 defaults). */
export const DEFAULTS: Readonly<Settings> = Object.freeze({
  method: '转盘',
  dingJu: '拆补',
  kongWang: '时空',
  centerLodge: '寄坤二宫',
  ziHour: '23:00',
  termSwitch: 'exact',
});
