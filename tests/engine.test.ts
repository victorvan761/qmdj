// The engine (SPEC §8): the golden charts field for field, the tables, the open-question settings, and
// invariants over every hour of a year.
import { Lunar } from 'lunar-typescript';
import { describe, expect, it, vi } from 'vitest';
import golden from '../reference/golden_charts.json';
import {
  BRANCHES, CHANG_SHENG, DEFAULTS, GODS, HORSE, JI_XING, JU, KE, PALACE, QIYI, RING, RU_MU, SIXTY, STAGES, STEMS, XUN,
  YUAN, castChart, formatInput, parseInput, stageAt, type Chart, type PalaceNo, type Settings, type Stem,
} from '../src/engine';

type Case = (typeof golden.cases)[number];
const cast = (time: string, settings: Partial<Settings> = {}) => castChart(parseInput(time)!, { ...DEFAULTS, ...settings });

// ── Golden charts ────────────────────────────────────────────────────────────────────────────────────────────
// R1–R6 are 玄天排盘's own screenshots and must always pass. D1–D13 use the default rules and aren't confirmed yet.

function expectChart(c: Case) {
  const chart = cast(c.input);
  expect(chart.header, 'header').toEqual(c.header);
  expect(chart.jieqi, 'jieqi').toEqual(c.jieqi);
  expect(chart.derived, 'derived').toEqual(c.derived);
  expect(chart.center, 'center').toBe(c.center);
  expect(Object.keys(chart.palaces).sort(), 'palace numbers').toEqual(Object.keys(c.palaces).sort());
  for (const [p, want] of Object.entries(c.palaces)) {
    expect(chart.palaces[Number(p) as PalaceNo], `palace ${p}`).toEqual(want);
  }
}

const title = (c: Case) => `${c.id} ${c.input} · ${c.note}${c.openQuestion ? ` (${c.openQuestion})` : ''}`;
const reference = golden.cases.filter((c) => c.confirmedInReference);
const unconfirmed = golden.cases.filter((c) => !c.confirmedInReference);

describe('R1–R6: 玄天排盘 screenshots (must pass)', () => {
  it('the golden charts hold the six reference charts', () => {
    expect(reference.map((c) => c.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']);
  });
  for (const c of reference) it(title(c), () => expectChart(c));
});

describe('D1–D13: default rules, not yet confirmed in 玄天排盘', () => {
  it('the golden charts hold the thirteen edge cases', () => {
    expect(unconfirmed.map((c) => c.id)).toEqual(Array.from({ length: 13 }, (_, i) => `D${i + 1}`));
  });
  for (const c of unconfirmed) it(title(c), () => expectChart(c));
});

// ── Open questions ───────────────────────────────────────────────────────────────────────────────────────────
// Each setting flips one default to the "Otherwise it means" column of SPEC §9, so answering Q1–Q3 in 玄天排盘
// is a one-line change to DEFAULTS (plus regenerating the golden charts).

it('DEFAULTS is frozen, so nothing can change the settings of every chart cast after it', () => {
  expect(Object.isFrozen(DEFAULTS)).toBe(true);
});

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

// ── Reading a time ───────────────────────────────────────────────────────────────────────────────────────────

describe('reading a time', () => {
  it('parseInput reads YYYY-MM-DDTHH:mm as wall-clock fields, and formatInput writes them back', () => {
    const input = { year: 1996, month: 6, day: 20, hour: 18, minute: 16 };
    expect(parseInput('1996-06-20T18:16')).toEqual(input);
    expect(formatInput(input)).toBe('1996-06-20T18:16');
    expect(formatInput({ year: 2026, month: 11, day: 7, hour: 9, minute: 5 })).toBe('2026-11-07T09:05');
  });

  it('parseInput accepts both ends of 1900–2100 and 29 February in a leap year', () => {
    expect(parseInput('1900-01-01T00:00')?.year).toBe(1900);
    expect(parseInput('2100-12-31T23:59')?.year).toBe(2100);
    expect(parseInput('2024-02-29T12:00')?.day).toBe(29);
  });

  it.each([
    '1899-12-31T23:59', '2101-01-01T00:00', '2026-02-29T10:00', '2026-02-30T10:00', '2026-04-31T10:00',
    '2026-13-01T00:00', '2026-11-04T24:00', '2026-11-04T10:60', '2026-11-04', '1996-06-20T18:16:00', 'not a date', '',
  ])('parseInput gives null for %j', (text) => {
    expect(parseInput(text)).toBeNull();
  });

  it('castChart throws for an input that is not a real minute from 1900 to 2100', () => {
    const real = { year: 2026, month: 11, day: 4, hour: 8, minute: 0 };
    for (const bad of [{ year: 2101, month: 1, day: 1 }, { month: 2, day: 30 }, { hour: 24 }, { minute: 0.5 }]) {
      expect(() => castChart({ ...real, ...bad }), JSON.stringify(bad)).toThrow(RangeError);
    }
  });

  it.each(['getPrevJieQi', 'getNextJieQi'] as const)(
    'castChart names the 节气 when lunar-typescript gives one it does not know (%s)',
    (method) => {
      const real = Lunar.prototype[method];
      const spy = vi.spyOn(Lunar.prototype, method).mockImplementation(function (this: Lunar, wholeDay?: boolean) {
        const term = real.call(this, wholeDay);
        return Object.assign(Object.create(term), { getName: () => 'DONG_ZHI' });
      });
      try {
        expect(() => cast('2026-11-04T08:00')).toThrow('unexpected 节气 name from lunar-typescript: DONG_ZHI');
      } finally {
        spy.mockRestore();
      }
    },
  );
});

// ── Tables (SPEC §6) ─────────────────────────────────────────────────────────────────────────────────────────
// Cross-checks between tables catch a mistyped entry that the 19 golden charts would not reach.

const sorted = (xs: Iterable<string | number>) => [...xs].sort();

describe('palaces', () => {
  it('the ring visits each outer palace once, clockwise from 坎1', () => {
    expect(RING).toEqual([1, 8, 3, 4, 9, 2, 7, 6]);
    expect(sorted(RING)).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
    expect(RING.map((p) => PALACE[p].trigram).join('')).toBe('坎艮震巽离坤兑乾');
  });

  it('each branch sits in exactly one palace', () => {
    expect(sorted(RING.map((p) => PALACE[p].branches).join(''))).toEqual(sorted(BRANCHES));
  });

  it('corner palaces list their branches left to right as drawn on the south-up grid', () => {
    expect([PALACE[8].branches, PALACE[4].branches, PALACE[2].branches, PALACE[6].branches])
      .toEqual(['寅丑', '辰巳', '未申', '亥戌']);
  });

  it('home stars and home doors match SPEC §6, each door with its element', () => {
    expect(RING.map((p) => PALACE[p].star).join(' ')).toBe('天蓬 天任 天冲 天辅 天英 天芮 天柱 天心');
    expect(RING.map((p) => PALACE[p].door + PALACE[p].element).join(' '))
      .toBe('休门水 生门土 伤门木 杜门木 景门火 死门土 惊门金 开门金');
  });

  it('五行 overcoming: 木克土, 土克水, 水克火, 火克金, 金克木', () => {
    expect(KE).toEqual({ 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' });
  });
});

describe('stems, branches and the 60-cycle', () => {
  it('三奇六仪 are the nine stems other than 甲, laid 戊己庚辛壬癸丁丙乙', () => {
    expect(QIYI.join('')).toBe('戊己庚辛壬癸丁丙乙');
    expect(sorted(QIYI)).toEqual(sorted(STEMS.replace('甲', '')));
  });

  it('the 60 干支 pairs run from 甲子 to 癸亥, each once', () => {
    expect(new Set(SIXTY).size).toBe(60);
    expect([SIXTY[0], SIXTY[10], SIXTY[59], SIXTY.indexOf('甲申')]).toEqual(['甲子', '甲戌', '癸亥', 20]);
  });
});

describe('局 table (拆补法)', () => {
  const yang = Object.entries(JU.阳);
  const yin = Object.entries(JU.阴);
  const wrap = (n: number) => ((n - 1) % 9) + 1;

  it('lists the 24 节气 from 冬至: 冬至 through 芒种 阳遁, 夏至 through 大雪 阴遁', () => {
    expect(yang.map(([term]) => term).join(' ')).toBe('冬至 小寒 大寒 立春 雨水 惊蛰 春分 清明 谷雨 立夏 小满 芒种');
    expect(yin.map(([term]) => term).join(' ')).toBe('夏至 小暑 大暑 立秋 处暑 白露 秋分 寒露 霜降 立冬 小雪 大雪');
  });

  it('each 阴遁 row is 10 minus its 阳遁 counterpart (冬至 ↔ 夏至 …)', () => {
    yang.forEach(([term, ju], i) => expect(yin[i][1], `${term} ↔ ${yin[i][0]}`).toEqual(ju.map((n) => 10 - n)));
  });

  it('上 → 中 → 下 steps by 6 in 阳遁 and by 3 in 阴遁, mod 9', () => {
    for (const [term, [a, b, c]] of yang) expect([b, c], term).toEqual([wrap(a + 6), wrap(a + 12)]);
    for (const [term, [a, b, c]] of yin) expect([b, c], term).toEqual([wrap(a + 3), wrap(a + 6)]);
  });

  it('元 from the 符头 branch: 子午卯酉 上, 寅申巳亥 中, 辰戌丑未 下', () => {
    expect(YUAN.map((y) => y.name)).toEqual(['上元', '中元', '下元']);
    const yuanOf = (branch: string) => YUAN.find((y) => y.branches.includes(branch))!.name[0];
    expect([...BRANCHES].map(yuanOf).join('')).toBe('上下中上下中上下中上下中');
  });
});

describe('十二长生', () => {
  const stems = [...STEMS] as Stem[];

  it('the labels run 长生 沐浴 冠带 临官 帝旺 衰 病 死 墓 绝 胎 养', () => {
    expect(STAGES).toBe('长沐冠临旺衰病死墓绝胎养');
  });

  it('every stem is 长生 at its 长生 branch', () => {
    for (const s of stems) expect(stageAt(s, CHANG_SHENG[s]), s).toBe(0);
  });

  it('yang stems count forward, yin stems backward; 戊 follows 丙 and 己 follows 丁', () => {
    expect(stageAt('甲', '子')).toBe(1); // 亥 → 子 forward
    expect(stageAt('乙', '巳')).toBe(1); // 午 → 巳 backward
    for (const b of BRANCHES) {
      expect(stageAt('戊', b)).toBe(stageAt('丙', b));
      expect(stageAt('己', b)).toBe(stageAt('丁', b));
    }
  });

  it('R1 巽4: 天盘 庚乙 reads 养长 冠沐 over 辰巳; 地盘 己 reads 衰旺', () => {
    const labels = (s: Stem) => [...PALACE[4].branches].map((b) => STAGES[stageAt(s, b)]).join('');
    expect([labels('庚'), labels('乙'), labels('己')]).toEqual(['养长', '冠沐', '衰旺']);
  });

  it("each stem's 入墓 palace holds the branch where its stage is 墓", () => {
    for (const s of stems) {
      const tombBranch = [...BRANCHES].find((b) => stageAt(s, b) === STAGES.indexOf('墓'))!;
      if (s === '甲') expect(RU_MU[s]).toBeUndefined(); // 甲 is never displayed
      else expect(PALACE[RU_MU[s]!].branches, s).toContain(tombBranch);
    }
  });
});

describe('marks', () => {
  it('击刑 palaces match SPEC §6', () => {
    expect(JI_XING).toEqual({ 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 });
  });

  it('旬: 仪 run 戊己庚辛壬癸 and 空亡 are the two branches each 旬 skips', () => {
    XUN.forEach((x, i) => {
      expect(x.head).toBe(SIXTY[i * 10]);
      expect(x.yi).toBe(QIYI[i]);
      expect(x.kong).toBe(BRANCHES[(i * 10 + 10) % 12] + BRANCHES[(i * 10 + 11) % 12]);
    });
    expect(XUN.map((x) => x.kong).join(' ')).toBe('戌亥 申酉 午未 辰巳 寅卯 子丑');
  });

  it('驿马 by 三合: 申子辰 → 寅, 寅午戌 → 申, 巳酉丑 → 亥, 亥卯未 → 巳', () => {
    expect([...BRANCHES].map((b) => HORSE[b]).join('')).toBe('寅亥申巳寅亥申巳寅亥申巳');
  });

  it('八神 order', () => {
    expect(GODS.join(' ')).toBe('值符 腾蛇 太阴 六合 白虎 玄武 九地 九天');
  });
});

// ── Invariants over every hour of 2026 (8,760 charts) ────────────────────────────────────────────────────────
// One test per month. Each collects every violation and asserts once, so a failure lists the hours involved.

const YEAR = 2026;
const SCORES = new Set([100, 50, 25, 12.5, 6.25]);
const homeStar = (p: PalaceNo) => (p === 2 ? '芮禽' : PALACE[p].star);
const sameSet = (a: readonly string[], b: readonly string[]) => sorted(a).join() === sorted(b).join();

function violations(c: Chart): string[] {
  const out: string[] = [];
  const ps = RING.map((p) => c.palaces[p]);
  if (!sameSet(ps.map((x) => x.star), RING.map(homeStar))) out.push('stars not each once');
  if (!sameSet(ps.map((x) => x.door), RING.map((p) => PALACE[p].door))) out.push('doors not each once');
  if (!sameSet(ps.map((x) => x.god), GODS)) out.push('deities not each once');

  const heaven = ps.flatMap((x) => x.heaven.map((s) => s.stem));
  const earth = ps.flatMap((x) => x.earth.map((s) => s.stem));
  if (!sameSet(heaven, earth) || !sameSet(earth, QIYI)) out.push('天盘 stems are not a permutation of 地盘 stems');

  for (const p of RING) {
    const x = c.palaces[p];
    if (!SCORES.has(x.score)) out.push(`palace ${p} score ${x.score}`);
    if (x.heavenStages.length !== x.heaven.length || x.earthStages.length !== x.earth.length) {
      out.push(`palace ${p} 长生 groups don't match its stems`);
    }
  }

  const zf = c.palaces[c.derived.zhiFuPalace];
  if (zf.god !== '值符') out.push('值符 deity is not on zhiFuPalace');
  if (zf.star !== (c.header.zhiFu === '天芮' ? '芮禽' : c.header.zhiFu)) out.push('值符 star is not on zhiFuPalace');
  if (c.palaces[c.derived.zhiShiPalace].door !== c.header.zhiShi) out.push('值使 door is not on zhiShiPalace');

  if (c.header.pillars.hour[0] === '甲') {
    for (const p of RING) {
      const x = c.palaces[p];
      const stems = (s: { stem: string }[]) => s.map((f) => f.stem).join('');
      if (x.star !== homeStar(p) || x.door !== PALACE[p].door || stems(x.heaven) !== stems(x.earth)) {
        out.push(`甲 hour is not 伏吟 in palace ${p}`);
      }
    }
  }
  return out;
}

interface MonthResult {
  charts: number;
  jiaHours: number;
  bad: string[];
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const months = new Map<number, MonthResult>();

/** Every hour of the month, cast once however many tests ask, so no test depends on another having run first. */
function castMonth(month: number): MonthResult {
  const done = months.get(month);
  if (done) return done;
  const result: MonthResult = { charts: 0, jiaHours: 0, bad: [] };
  const days = new Date(Date.UTC(YEAR, month, 0)).getUTCDate();
  for (let day = 1; day <= days; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const c = castChart({ year: YEAR, month, day, hour, minute: 0 });
      result.charts++;
      if (c.header.pillars.hour[0] === '甲') result.jiaHours++;
      for (const v of violations(c)) result.bad.push(`${c.header.solar}: ${v}`);
    }
  }
  months.set(month, result);
  return result;
}

describe(`invariants over every hour of ${YEAR}`, () => {
  for (const month of MONTHS) {
    it(`month ${month}`, () => {
      expect(castMonth(month).bad).toEqual([]);
    });
  }

  it('covered 8,760 charts, about a tenth of them 甲 hours checked for 伏吟', () => {
    const all = MONTHS.map(castMonth);
    expect(all.reduce((n, m) => n + m.charts, 0)).toBe(8760);
    expect(all.reduce((n, m) => n + m.jiaHours, 0)).toBeGreaterThan(800);
  });
});
