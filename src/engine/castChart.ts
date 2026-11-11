// SPEC §5 steps 4–12: a pure function from a Beijing wall-clock minute to the whole chart.
// A line-for-line port of chart() in tools/reference/engine.py, with the same variable names (p0, home, target,
// k, steps, pd), so a failing case can be diffed against the Python's intermediate values.
import { readCalendar } from './calendar';
import { DEFAULTS } from './settings';
import {
  BRANCH_PALACE, DOOR_ELEMENT, GODS, HOME_DOOR, HOME_STAR, HORSE, JI_XING, JU, KE, PALACE_BRANCHES, PALACE_ELEMENT,
  QIYI, RING, RU_MU, STAGE_LABELS, XUN, YUAN, ganZhiIndex, mod, stageAt,
} from './tables';
import type {
  Branch, Chart, ChartInput, Door, EarthStem, God, HeavenStem, LuoShuNo, Palace, PalaceNo, Settings, StarLabel, Stem,
} from './types';

/** The palace k steps clockwise from p along the ring (negative k goes counterclockwise). */
const ringShift = (p: PalaceNo, k: number): PalaceNo => RING[mod(RING.indexOf(p) + k, 8)];

/** 中5 lodges in 坤2. */
const lodge = (p: LuoShuNo): PalaceNo => (p === 5 ? 2 : p);

/** k steps through the 洛书 order 1–9, 5 included, wrapping between 9 and 1. */
const luoShuStep = (p: LuoShuNo, k: number): LuoShuNo => (mod(p - 1 + k, 9) + 1) as LuoShuNo;

export function castChart(input: ChartInput, settings: Settings = DEFAULTS): Chart {
  // 1–3. Time basis, calendar, 节气 / 符头 / 元
  const cal = readCalendar(input, settings);
  const dayStem = cal.pillars.day[0] as Stem;
  const hourGz = cal.pillars.hour;

  // 4. 局 (拆补法): 遁 and number from the 节气 and the 元
  const { dun, ju: nums } = JU[cal.jieqi.current];
  const ju = nums[YUAN.indexOf(cal.jieqi.yuan)];
  const yang = dun === '阳';

  // 5. 地盘: 戊己庚辛壬癸丁丙乙 from palace `ju`, ascending in 阳遁, descending in 阴遁
  const earth = {} as Record<LuoShuNo, Stem>;
  const palaceOf: Partial<Record<Stem, LuoShuNo>> = {};
  QIYI.forEach((stem, i) => {
    const p = luoShuStep(ju as LuoShuNo, yang ? i : -i);
    earth[p] = stem;
    palaceOf[stem] = p;
  });
  const earthStems = (p: PalaceNo): Stem[] => (p === 2 ? [earth[5], earth[2]] : [earth[p]]);

  // 6. 旬首, 值符, 值使: the hour's 旬 hides 甲 under its 仪; P0 is that 仪's 地盘 palace
  const hn = ganZhiIndex(hourGz);
  const xun = XUN[Math.floor(hn / 10)];
  const p0 = palaceOf[xun.yi]!;
  const home = lodge(p0);
  const zhiFuStar = HOME_STAR[p0];
  const zhiShiDoor = HOME_DOOR[home];

  // 7. 天盘 (转盘): the eight stars turn as a rigid ring so the 值符's home lands on the hour stem's palace.
  // 天禽 rides with 天芮 (芮禽), carrying the 中5 stem first.
  const hourStem = (hourGz[0] === '甲' ? xun.yi : hourGz[0]) as Stem;
  const target = lodge(palaceOf[hourStem]!);
  const k = RING.indexOf(target) - RING.indexOf(home);
  const starAt = {} as Record<PalaceNo, StarLabel>;
  const heavenAt = {} as Record<PalaceNo, Stem[]>;
  for (const h0 of RING) {
    const q = ringShift(h0, k);
    starAt[q] = h0 === 2 ? '芮禽' : (HOME_STAR[h0] as StarLabel);
    heavenAt[q] = earthStems(h0);
  }

  // 8. 八门: from P0 (5 allowed), walk the hour's position in its 旬 through 1–9, +1 in 阳遁, −1 in 阴遁.
  // Landing on 5 means 坤2. The doors turn as a ring so the 值使 lands there.
  const steps = hn % 10;
  const pd = lodge(luoShuStep(p0, yang ? steps : -steps));
  const kd = RING.indexOf(pd) - RING.indexOf(home);
  const doorAt = {} as Record<PalaceNo, Door>;
  for (const h0 of RING) doorAt[ringShift(h0, kd)] = HOME_DOOR[h0];

  // 9. 八神: 值符 on the target, the rest clockwise in 阳遁, counterclockwise in 阴遁
  const godAt = {} as Record<PalaceNo, God>;
  GODS.forEach((g, i) => {
    godAt[ringShift(target, yang ? i : -i)] = g;
  });

  // 10. 空亡 (时空) and 马星 (时马)
  const horseBranch = HORSE[hourGz[1] as Branch];
  const horsePalace = BRANCH_PALACE[horseBranch];
  const emptyPalaces = new Set(xun.kong.map((b) => BRANCH_PALACE[b]));

  // 11–12. Stem and door flags, 十二长生, score
  const stages = (stem: Stem, p: PalaceNo) => PALACE_BRANCHES[p].map((b) => STAGE_LABELS[stageAt(stem, b)]).join('');
  const palaces = {} as Record<PalaceNo, Palace>;
  for (const p of RING) {
    const tp = heavenAt[p];
    const dp = earthStems(p);
    const door = doorAt[p];
    const menPo = KE[DOOR_ELEMENT[door]] === PALACE_ELEMENT[p];
    const heaven: HeavenStem[] = tp.map((stem) => ({
      stem,
      jiXing: JI_XING[stem] === p,
      ruMu: RU_MU[stem] === p,
      riGan: stem === dayStem && dayStem !== '甲',
    }));
    const earthFlags: EarthStem[] = dp.map((stem) => ({ stem, jiXing: JI_XING[stem] === p, ruMu: RU_MU[stem] === p }));
    const kongWang = emptyPalaces.has(p);
    // n counts 空亡, 门迫 and each 击刑 / 入墓 among the 天盘 stems; 地盘 flags, 马星 and 日干 don't count.
    const n = Number(kongWang) + Number(menPo) + heaven.reduce((sum, f) => sum + Number(f.jiXing) + Number(f.ruMu), 0);
    palaces[p] = {
      god: godAt[p],
      star: starAt[p],
      door,
      menPo,
      heaven,
      earth: earthFlags,
      heavenStages: tp.map((s) => stages(s, p)),
      earthStages: dp.map((s) => stages(s, p)),
      kongWang,
      horse: p === horsePalace,
      score: 100 / 2 ** n,
    };
  }

  return {
    header: {
      solar: cal.solar,
      lunar: cal.lunar,
      pillars: cal.pillars,
      ju: `${dun}遁${ju}局`,
      xunShou: xun.head + xun.yi,
      zhiFu: zhiFuStar === '天禽' ? '芮禽' : zhiFuStar,
      zhiShi: zhiShiDoor,
      juShi: `${settings.method}-${settings.dingJu}-${settings.centerLodge}`,
    },
    jieqi: cal.jieqi,
    derived: {
      dun,
      juNumber: ju,
      zhiFuPalace: target,
      zhiShiPalace: pd,
      kongWangBranches: [...xun.kong],
      horseBranch,
    },
    center: earth[5],
    palaces,
  };
}
