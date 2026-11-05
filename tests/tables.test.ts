// SPEC §6 tables. Cross-checks between tables catch transcription typos that the 19 golden charts would not reach.
import { describe, expect, it } from 'vitest';
import {
  BRANCHES, BRANCH_PALACE, CHANG_SHENG, DOOR_ELEMENT, GODS, HOME_DOOR, HOME_STAR, HORSE, JIEQI, JI_XING, JU, KE,
  PALACE_BRANCHES, PALACE_ELEMENT, QIYI, RING, RU_MU, STAGES, STAGE_LABELS, STEMS, TRIGRAM, XUN, YUAN_BY_BRANCH,
  ganZhiAt, ganZhiIndex, mod, stageAt,
} from '../src/engine/tables';

const sorted = <T,>(xs: readonly T[]) => [...xs].sort();

describe('palaces', () => {
  it('the ring visits each outer palace once, clockwise from 坎1', () => {
    expect(RING).toEqual([1, 8, 3, 4, 9, 2, 7, 6]);
    expect(sorted(RING)).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
  });

  it('each branch sits in exactly one palace, and BRANCH_PALACE agrees', () => {
    expect(sorted(RING.flatMap((p) => PALACE_BRANCHES[p]))).toEqual(sorted(BRANCHES));
    for (const p of RING) for (const b of PALACE_BRANCHES[p]) expect(BRANCH_PALACE[b], b).toBe(p);
  });

  it('corner palaces list their branches left to right as drawn on the south-up grid', () => {
    expect([PALACE_BRANCHES[8], PALACE_BRANCHES[4], PALACE_BRANCHES[2], PALACE_BRANCHES[6]])
      .toEqual([['寅', '丑'], ['辰', '巳'], ['未', '申'], ['亥', '戌']]);
  });

  it('home stars, home doors and trigrams are each used once', () => {
    expect(new Set(RING.map((p) => HOME_STAR[p])).size).toBe(8);
    expect(HOME_STAR[5]).toBe('天禽');
    expect(new Set(RING.map((p) => HOME_DOOR[p])).size).toBe(8);
    expect(RING.map((p) => TRIGRAM[p]).join('')).toBe('坎艮震巽离坤兑乾');
  });

  it('elements match SPEC §6, and every door has an element', () => {
    expect(RING.map((p) => PALACE_ELEMENT[p]).join('')).toBe('水土木木火土金金');
    expect(RING.map((p) => DOOR_ELEMENT[HOME_DOOR[p]]).join('')).toBe('水土木木火土金金');
  });

  it('五行 overcoming: 木克土, 土克水, 水克火, 火克金, 金克木', () => {
    expect(KE).toEqual({ 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' });
  });
});

describe('stems, branches and the 60-cycle', () => {
  it('三奇六仪 are the nine stems other than 甲, laid 戊己庚辛壬癸丁丙乙', () => {
    expect(QIYI.join('')).toBe('戊己庚辛壬癸丁丙乙');
    expect(sorted(QIYI)).toEqual(sorted(STEMS.filter((s) => s !== '甲')));
  });

  it('ganZhiIndex and ganZhiAt are inverse over the 60-cycle', () => {
    for (let n = 0; n < 60; n++) expect(ganZhiIndex(ganZhiAt(n))).toBe(n);
    expect([ganZhiAt(0), ganZhiAt(10), ganZhiAt(59)]).toEqual(['甲子', '甲戌', '癸亥']);
    expect(ganZhiIndex('甲申')).toBe(20);
  });

  it('mod never goes negative', () => {
    expect([mod(-1, 9), mod(-10, 8), mod(17, 8), mod(0, 12)]).toEqual([8, 6, 1, 0]);
  });
});

describe('局 table (拆补法)', () => {
  it('lists the 24 节气 from 冬至: 冬至 through 芒种 阳遁, 夏至 through 大雪 阴遁', () => {
    expect(new Set(JIEQI).size).toBe(24);
    expect([JIEQI[0], JIEQI[11], JIEQI[12], JIEQI[23]]).toEqual(['冬至', '芒种', '夏至', '大雪']);
    JIEQI.forEach((t, i) => expect(JU[t].dun, t).toBe(i < 12 ? '阳' : '阴'));
  });

  it('each 阴遁 row is 10 minus its 阳遁 counterpart (冬至 ↔ 夏至 …)', () => {
    for (let i = 0; i < 12; i++) {
      expect(JU[JIEQI[i + 12]].ju, `${JIEQI[i]} ↔ ${JIEQI[i + 12]}`).toEqual(JU[JIEQI[i]].ju.map((n) => 10 - n));
    }
  });

  it('上 → 中 → 下 steps by 6 in 阳遁 and by 3 in 阴遁, mod 9', () => {
    for (const t of JIEQI) {
      const [a, b, c] = JU[t].ju;
      const step = JU[t].dun === '阳' ? 6 : 3;
      expect([b, c], t).toEqual([mod(a - 1 + step, 9) + 1, mod(a - 1 + 2 * step, 9) + 1]);
    }
  });

  it('元 from the 符头 branch: 子午卯酉 上, 寅申巳亥 中, 辰戌丑未 下', () => {
    expect(BRANCHES.map((b) => YUAN_BY_BRANCH[b][0]).join('')).toBe('上下中上下中上下中上下中');
  });
});

describe('十二长生', () => {
  it('stage names and one-character labels line up', () => {
    expect(STAGES).toHaveLength(12);
    expect(STAGE_LABELS.join('')).toBe('长沐冠临旺衰病死墓绝胎养');
    STAGES.forEach((s, i) => expect(s.includes(STAGE_LABELS[i]), s).toBe(true));
  });

  it('every stem is 长生 at its 长生 branch', () => {
    for (const s of STEMS) expect(stageAt(s, CHANG_SHENG[s]), s).toBe(0);
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
    const labels = (s: (typeof STEMS)[number]) => PALACE_BRANCHES[4].map((b) => STAGE_LABELS[stageAt(s, b)]).join('');
    expect([labels('庚'), labels('乙'), labels('己')]).toEqual(['养长', '冠沐', '衰旺']);
  });

  it("each stem's 入墓 palace holds the branch where its stage is 墓", () => {
    const TOMB = STAGES.indexOf('墓');
    for (const s of STEMS) {
      const tombBranch = BRANCHES.find((b) => stageAt(s, b) === TOMB)!;
      if (s === '甲') expect(RU_MU[s]).toBeUndefined(); // 甲 is never displayed
      else expect(RU_MU[s], s).toBe(BRANCH_PALACE[tombBranch]);
    }
  });
});

describe('marks', () => {
  it('击刑 palaces match SPEC §6', () => {
    expect(JI_XING).toEqual({ 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 });
  });

  it('旬: 仪 run 戊己庚辛壬癸 and 空亡 are the two branches each 旬 skips', () => {
    XUN.forEach((x, i) => {
      expect(x.head).toBe(ganZhiAt(i * 10));
      expect(x.yi).toBe(QIYI[i]);
      expect(x.kong).toEqual([BRANCHES[(i * 10 + 10) % 12], BRANCHES[(i * 10 + 11) % 12]]);
    });
    expect(XUN.map((x) => x.kong.join('')).join(' ')).toBe('戌亥 申酉 午未 辰巳 寅卯 子丑');
  });

  it('驿马 by 三合: 申子辰 → 寅, 寅午戌 → 申, 巳酉丑 → 亥, 亥卯未 → 巳', () => {
    expect(BRANCHES.map((b) => HORSE[b]).join('')).toBe('寅亥申巳寅亥申巳寅亥申巳');
  });

  it('八神 order', () => {
    expect(GODS.join(' ')).toBe('值符 腾蛇 太阴 六合 白虎 玄武 九地 九天');
  });
});
