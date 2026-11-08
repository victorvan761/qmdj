// Each calendar setting flips one default to the "Otherwise it means" column of SPEC §9, so answering Q1–Q3 in
// 玄天排盘 becomes a one-line settings change (plus regenerating the fixtures).
import { describe, expect, it } from 'vitest';
import { parseInput } from '../src/engine/calendar';
import { castChart } from '../src/engine/castChart';
import { DEFAULTS } from '../src/engine/settings';
import type { Settings } from '../src/engine/types';

const cast = (s: string, overrides: Partial<Settings> = {}) => castChart(parseInput(s), { ...DEFAULTS, ...overrides });

describe('Q1 · when the day changes at night (2026-11-05 23:30)', () => {
  it('default 23:00: 日柱 甲申, 阴遁8局', () => {
    const c = cast('2026-11-05T23:30');
    expect([c.header.pillars.day, c.header.ju]).toEqual(['甲申', '阴遁8局']);
  });

  it("ziHour '00:00': 日柱 癸未, 阴遁5局", () => {
    const c = cast('2026-11-05T23:30', { ziHour: '00:00' });
    expect([c.header.pillars.day, c.header.ju]).toEqual(['癸未', '阴遁5局']);
  });
});

describe('Q2 · 月柱 and 局 at the 节气 (2026-11-07 16:30, 立冬 at 17:52)', () => {
  it('default exact: 月柱 戊戌, 阴遁8局', () => {
    const c = cast('2026-11-07T16:30');
    expect([c.header.pillars.month, c.header.ju, c.jieqi.current]).toEqual(['戊戌', '阴遁8局', '霜降']);
  });

  it("termSwitch 'day': 月柱 己亥, 阴遁9局", () => {
    const c = cast('2026-11-07T16:30', { termSwitch: 'day' });
    expect([c.header.pillars.month, c.header.ju, c.jieqi.current]).toEqual(['己亥', '阴遁9局', '立冬']);
  });
});

describe('Q3 · 年柱 at 立春 (2027-02-04 08:30, 立春 at 09:46)', () => {
  it('default exact: 丙午 · 辛丑, 阳遁9局', () => {
    const c = cast('2027-02-04T08:30');
    expect([c.header.pillars.year, c.header.pillars.month, c.header.ju]).toEqual(['丙午', '辛丑', '阳遁9局']);
  });

  it("termSwitch 'day': 丁未 · 壬寅, 阳遁5局", () => {
    const c = cast('2027-02-04T08:30', { termSwitch: 'day' });
    expect([c.header.pillars.year, c.header.pillars.month, c.header.ju]).toEqual(['丁未', '壬寅', '阳遁5局']);
  });
});
