// Every ID the engine can emit has a 中文 display form and an English name (SPEC §4, §6), and both languages carry
// every UI string.
import { describe, expect, it } from 'vitest';
import { BRANCHES, GODS, HOME_DOOR, HOME_STAR, JIEQI, RING, STEMS, TRIGRAM, YUAN, type StarLabel } from '../src/engine';
import { branch, door, god, jieqi, star, stem, t, trigram, yuan, type Form } from '../src/i18n';
import { en } from '../src/i18n/en';
import { zh } from '../src/i18n/zh';
import { CJK } from './html';

const FORMS: Form[] = ['grid', 'full'];
const STARS = [...Object.values(HOME_STAR), '芮禽' as StarLabel];
const DOORS = RING.map((p) => HOME_DOOR[p]);

function expectEnglish(id: string, s: string) {
  expect(s, id).toBeTruthy();
  expect(CJK.test(s), `${id} → ${s}`).toBe(false);
}

describe('glossary', () => {
  it('stems and branches have pinyin', () => {
    for (const s of STEMS) expectEnglish(s, stem('en', s));
    for (const b of BRANCHES) expectEnglish(b, branch('en', b));
    expect([stem('en', '庚'), branch('en', '子')]).toEqual(['Geng', 'Zi']);
  });

  it('every star, door and deity has a grid label and a full name', () => {
    for (const form of FORMS) {
      for (const s of STARS) expectEnglish(`${s} ${form}`, star('en', s, form));
      for (const d of DOORS) expectEnglish(`${d} ${form}`, door('en', d, form));
      for (const g of GODS) expectEnglish(`${g} ${form}`, god('en', g, form));
    }
    expect([god('en', '白虎', 'grid'), star('en', '天柱', 'grid'), door('en', '死门', 'grid')]).toEqual(['Tiger', 'Zhu', 'Death']);
    expect([star('en', '天任', 'full'), door('en', '生门', 'full')]).toEqual(['Tian Ren', 'Life Gate']);
  });

  it('every 节气, 元 and trigram has an English form', () => {
    for (const j of JIEQI) expectEnglish(j, jieqi('en', j));
    for (const y of YUAN) expectEnglish(y, yuan('en', y));
    expect(RING.map((p) => trigram('en', TRIGRAM[p])).join('')).toBe('☵☶☳☴☲☷☱☰');
    expect(jieqi('en', '芒种')).toBe('Grain in Ear');
  });

  it('中文 shows the IDs themselves, except 腾蛇, which 玄天排盘 prints as 螣蛇', () => {
    expect(god('zh', '腾蛇', 'grid')).toBe('螣蛇');
    for (const g of GODS.filter((x) => x !== '腾蛇')) expect(god('zh', g, 'grid')).toBe(g);
    for (const s of STARS) expect(star('zh', s, 'grid')).toBe(s);
    for (const d of DOORS) expect(door('zh', d, 'full')).toBe(d);
    expect([stem('zh', '庚'), branch('zh', '子'), jieqi('zh', '芒种'), yuan('zh', '中元'), trigram('zh', '巽')])
      .toEqual(['庚', '子', '芒种', '中元', '巽']);
  });
});

describe('UI strings', () => {
  it('both languages have the same keys, none empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
    for (const [k, v] of Object.entries(zh)) expect(v, k).toBeTruthy();
  });

  it('no English string contains CJK', () => {
    for (const [k, v] of Object.entries(en)) expectEnglish(k, v);
  });

  it('match the SPEC §4 table', () => {
    expect([t('zh', 'input.cast'), t('en', 'input.cast')]).toEqual(['点击起局', 'Cast chart']);
    expect([t('zh', 'chart.terms.show'), t('en', 'chart.terms.show')]).toEqual(['点击显示节气', 'Show solar terms']);
    expect([t('zh', 'input.lodge.value'), t('en', 'input.lodge.value')]).toEqual(['寄坤二宫', 'Kun 2']);
  });
});
