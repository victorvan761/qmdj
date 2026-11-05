// SPEC §8 UI tests: in 中文, R1–R6 render the same text, colors and markers as 玄天排盘's screenshots.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/golden_charts.json';
import { TRIGRAM, castChart, parseInput, type PalaceNo } from '../src/engine';
import type { Lang } from '../src/i18n';
import { ChartScreen } from '../src/ui/ChartScreen';
import { InputScreen } from '../src/ui/InputScreen';
import { field, find, findAll, hasClass, parseHtml, text, textRuns, type El } from './html';

const noop = () => {};
const render = (el: ReactElement) => parseHtml(renderToStaticMarkup(el));

const chartScreen = (input: string, lang: Lang = 'zh', termsOpen = false) =>
  render(
    <ChartScreen lang={lang} chart={castChart(parseInput(input))} termsOpen={termsOpen}
      onBack={noop} onToggleTerms={noop} onLang={noop} />,
  );

const inputScreen = (value: string, lang: Lang = 'zh') =>
  render(<InputScreen lang={lang} value={value} onChange={noop} onCast={noop} onReset={noop} onLang={noop} />);

const cell = (doc: El, p: number | string) => find(doc, (e) => e.attrs['data-palace'] === String(p), `palace ${p}`);
const stems = (scope: El, k: 'heaven' | 'earth') => findAll(field(scope, k), (e) => hasClass(e, 'stem'));
const tone = (e: El) => (hasClass(e, 'jixing') ? 'purple' : hasClass(e, 'rumu') ? 'green' : 'black');
const ZH_GOD = (g: string) => (g === '腾蛇' ? '螣蛇' : g);

const reference = fixtures.cases.filter((c) => c.confirmedInReference);
const caseById = (id: string) => fixtures.cases.find((c) => c.id === id)!;

describe('chart screen in 中文 renders R1–R6 as in the screenshots', () => {
  for (const c of reference) {
    it(`${c.id} header card`, () => {
      const card = field(chartScreen(c.input), 'info');
      const h = c.header;
      const pillars = [h.pillars.year, h.pillars.month, h.pillars.day, h.pillars.hour];
      expect(textRuns(card)).toEqual([
        '阳历', h.solar, '阴历', h.lunar, '年', '月', '日', '时', ...pillars.map((g) => g[0]), ...pillars.map((g) => g[1]),
        '选局：', h.ju, '旬首：', h.xunShou, '值符：', h.zhiFu, '值使：', h.zhiShi, '局式：', h.juShi,
      ]);
    });

    it(`${c.id} palaces: text, colors and markers`, () => {
      const doc = chartScreen(c.input);
      for (const [p, want] of Object.entries(c.palaces)) {
        const at = `${c.id} palace ${p}`;
        const box = cell(doc, p);
        expect(text(field(box, 'score')), at).toBe(String(want.score));
        expect(text(field(box, 'god')), at).toBe(ZH_GOD(want.god));
        expect(text(field(box, 'marks')), at).toBe((want.kongWang ? '○' : '') + (want.horse ? '♞' : ''));
        expect(text(field(box, 'star')), at).toBe(want.star);
        expect(text(field(box, 'door')), at).toBe(want.door);
        expect(hasClass(field(box, 'door'), 'menpo'), `${at} 门迫`).toBe(want.menPo);
        expect(text(field(box, 'num')), at).toBe(p);
        expect(text(field(box, 'watermark')), at).toBe(TRIGRAM[Number(p) as PalaceNo]);
        expect(text(field(box, 'heavenStages')), at).toBe(want.heavenStages.join(' '));
        expect(text(field(box, 'earthStages')), at).toBe(want.earthStages.join(' '));

        const heaven = stems(box, 'heaven');
        expect(heaven.map(text), `${at} 天盘`).toEqual(want.heaven.map((s) => s.stem));
        heaven.forEach((e, i) => {
          const s = want.heaven[i];
          expect(tone(e), `${at} 天盘 ${s.stem}`).toBe(s.jiXing ? 'purple' : s.ruMu ? 'green' : 'black');
          expect(hasClass(e, 'rigan'), `${at} 天盘 ${s.stem} square`).toBe(s.riGan);
        });
        const earth = stems(box, 'earth');
        expect(earth.map(text), `${at} 地盘`).toEqual(want.earth.map((s) => s.stem));
        earth.forEach((e, i) => {
          const s = want.earth[i];
          expect(tone(e), `${at} 地盘 ${s.stem}`).toBe(s.jiXing ? 'purple' : s.ruMu ? 'green' : 'black');
          expect(hasClass(e, 'rigan'), `${at} 地盘 never squared`).toBe(false);
        });
      }
      // 中5 shows only its number and its 地盘 stem.
      expect(textRuns(cell(doc, 5))).toEqual(['5', c.center]);
    });
  }

  it('spot checks transcribed from the screenshots', () => {
    const r1 = chartScreen(caseById('R1').input);
    const gen8 = cell(r1, 8);
    expect([text(field(gen8, 'score')), text(field(gen8, 'marks'))]).toEqual(['12.5', '○']);
    expect(hasClass(field(gen8, 'door'), 'menpo')).toBe(true); // red 杜门
    expect(tone(stems(gen8, 'heaven')[0])).toBe('green'); // 己
    expect(hasClass(stems(cell(r1, 1), 'heaven')[0], 'rigan')).toBe(true); // 坎1 戊 in a square
    expect(text(field(cell(r1, 1), 'god'))).toBe('螣蛇');
    expect(tone(stems(cell(r1, 3), 'earth')[0])).toBe('purple'); // 震3 地盘 戊
    expect(text(field(cell(r1, 6), 'marks'))).toBe('♞');

    const qian6 = stems(cell(chartScreen(caseById('R3').input), 6), 'heaven'); // 乾6 戊辛
    expect(qian6.map((e) => [text(e), tone(e), hasClass(e, 'rigan')])).toEqual([['戊', 'green', true], ['辛', 'black', false]]);

    const kun2 = stems(cell(chartScreen(caseById('R4').input), 2), 'earth'); // lodged 中5 己 first, purple
    expect(kun2.map((e) => [text(e), tone(e)])).toEqual([['己', 'purple'], ['壬', 'black']]);

    const r5 = chartScreen(caseById('R5').input); // 甲 day: no square anywhere
    expect(findAll(r5, (e) => hasClass(e, 'rigan'))).toEqual([]);

    const r6 = chartScreen(caseById('R6').input);
    expect([text(field(r6, 'zhiFu')), text(field(r6, 'zhiShi'))]).toEqual(['芮禽', '死门']);
  });

  it('the grid reads south up: 巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6', () => {
    const order = findAll(chartScreen(caseById('R1').input), (e) => 'data-palace' in e.attrs).map((e) => e.attrs['data-palace']);
    expect(order.join('')).toBe('492357816');
  });

  it('the 节气 panel is collapsed by default and shows the terms, 元 and 符头 when opened', () => {
    const r1 = caseById('R1');
    const closed = chartScreen(r1.input);
    expect(text(field(closed, 'termsToggle'))).toBe('点击显示节气');
    expect(findAll(closed, (e) => e.attrs['data-k'] === 'terms')).toEqual([]);

    const open = chartScreen(r1.input, 'zh', true);
    expect(text(field(open, 'termsToggle'))).toBe('点击隐藏节气');
    const j = r1.jieqi;
    expect(textRuns(field(open, 'terms'))).toEqual([
      '当前节气：', `${j.current} ${j.currentStart}`, '下一节气：', `${j.next} ${j.nextStart}`, '元：', j.yuan, '符头：', j.fuTou,
    ]);
  });

  it('the footer carries the disclaimer', () => {
    expect(text(field(chartScreen(caseById('R1').input), 'footer'))).toBe('排盘内容仅供娱乐，请客观科学看待，抵制封建迷信');
  });
});

describe('input screen in 中文', () => {
  it('shows the title, the picker in 玄天 format, the four fixed rows and both buttons', () => {
    const doc = inputScreen('1996-06-20T18:20');
    expect(text(find(doc, (e) => e.tag === 'h1'))).toBe('奇门排盘');
    expect(findAll(doc, (e) => hasClass(e, 'field')).map(text)).toEqual([
      '日期选择：1996年/06月/20日 18:20', '排盘方式：转盘', '定局：拆补法', '标记旬空：时空', '中宫寄宫：寄坤二宫',
    ]);
    expect(findAll(doc, (e) => e.tag === 'button' && hasClass(e, 'btn')).map(text)).toEqual(['点击起局', '重置时间']);
  });

  it('the picker is a native datetime-local input limited to 1900–2100, minute precision', () => {
    const input = find(inputScreen('1996-06-20T18:20'), (e) => e.tag === 'input');
    expect(input.attrs).toMatchObject({
      type: 'datetime-local', value: '1996-06-20T18:20', min: '1900-01-01T00:00', max: '2100-12-31T23:59', step: '60',
    });
  });
});
