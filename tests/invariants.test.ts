// SPEC §8 invariants over every hour of 2026 (8,760 charts), one test per month.
// Each test collects every violation and asserts once, so a failure lists the hours involved.
import { describe, expect, it } from 'vitest';
import { castChart } from '../src/engine/castChart';
import { GODS, HOME_DOOR, HOME_STAR, QIYI, RING } from '../src/engine/tables';
import type { Chart, PalaceNo, StarLabel } from '../src/engine/types';

const YEAR = 2026;
const SCORES = new Set([100, 50, 25, 12.5, 6.25]);
const homeStar = (p: PalaceNo): StarLabel => (p === 2 ? '芮禽' : (HOME_STAR[p] as StarLabel));
const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join() === [...b].sort().join();

const STAR_LABELS = RING.map(homeStar);
const DOORS = RING.map((p) => HOME_DOOR[p]);

function violations(c: Chart): string[] {
  const out: string[] = [];
  const ps = RING.map((p) => c.palaces[p]);
  if (!sameSet(ps.map((x) => x.star), STAR_LABELS)) out.push('stars not each once');
  if (!sameSet(ps.map((x) => x.door), DOORS)) out.push('doors not each once');
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
      if (x.star !== homeStar(p) || x.door !== HOME_DOOR[p] || stems(x.heaven) !== stems(x.earth)) {
        out.push(`甲 hour is not 伏吟 in palace ${p}`);
      }
    }
  }
  return out;
}

describe(`invariants over every hour of ${YEAR}`, () => {
  let charts = 0;
  let jiaHours = 0;

  for (let month = 1; month <= 12; month++) {
    it(`month ${month}`, () => {
      const days = new Date(Date.UTC(YEAR, month, 0)).getUTCDate();
      const bad: string[] = [];
      for (let day = 1; day <= days; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const c = castChart({ year: YEAR, month, day, hour, minute: 0 });
          charts++;
          if (c.header.pillars.hour[0] === '甲') jiaHours++;
          for (const v of violations(c)) bad.push(`${c.header.solar}: ${v}`);
        }
      }
      expect(bad).toEqual([]);
    });
  }

  it('covered 8,760 charts, about a tenth of them 甲 hours checked for 伏吟', () => {
    expect(charts).toBe(8760);
    expect(jiaHours).toBeGreaterThan(800);
  });
});
