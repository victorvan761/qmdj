// The screens and the app's state (SPEC §8): R1–R6 render the same text, colors and markers as 玄天排盘's
// screenshots, and each action keeps and changes what SPEC §2 says. Layout is checked in a browser instead, by
// tools/fit-check.js.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import golden from '../reference/golden_charts.json';
import { clockInput, initialState, reducer } from '../src/App';
import { ChartScreen } from '../src/ChartScreen';
import { DatePicker } from '../src/DatePicker';
import { PALACE, castChart, parseInput, type PalaceNo } from '../src/engine';
import { InputScreen } from '../src/InputScreen';
import { field, find, findAll, hasClass, parseHtml, text, textRuns, type El } from './html';

const noop = () => {};
const render = (el: ReactElement) => parseHtml(renderToStaticMarkup(el));

const chartScreen = (input: string, termsOpen = false) =>
  render(<ChartScreen chart={castChart(parseInput(input)!)} termsOpen={termsOpen} onBack={noop} onToggleTerms={noop} />);

const inputScreen = (value: string) =>
  render(<InputScreen value={value} onChange={noop} onCast={noop} onReset={noop} />);

const cell = (doc: El, p: number | string) => find(doc, (e) => e.attrs['data-palace'] === String(p), `palace ${p}`);
const stems = (scope: El, k: 'heaven' | 'earth') => findAll(field(scope, k), (e) => hasClass(e, 'stem'));
const tone = (e: El) => (hasClass(e, 'jixing') ? 'purple' : hasClass(e, 'rumu') ? 'green' : 'black');
/** 玄天排盘 prints 腾蛇 as 螣蛇. */
const shownGod = (g: string) => (g === '腾蛇' ? '螣蛇' : g);

const reference = golden.cases.filter((c) => c.confirmedInReference);
const caseById = (id: string) => golden.cases.find((c) => c.id === id)!;

describe('chart screen renders R1–R6 as in the screenshots', () => {
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
        expect(text(field(box, 'god')), at).toBe(shownGod(want.god));
        expect(text(field(box, 'marks')), at).toBe((want.kongWang ? '○' : '') + (want.horse ? '♞' : ''));
        expect(text(field(box, 'star')), at).toBe(want.star);
        expect(text(field(box, 'door')), at).toBe(want.door);
        expect(hasClass(field(box, 'door'), 'menpo'), `${at} 门迫`).toBe(want.menPo);
        expect(text(field(box, 'num')), at).toBe(p);
        expect(text(field(box, 'watermark')), at).toBe(PALACE[Number(p) as PalaceNo].trigram);
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

    const open = chartScreen(r1.input, true);
    expect(text(field(open, 'termsToggle'))).toBe('点击隐藏节气');
    const j = r1.jieqi;
    expect(textRuns(field(open, 'terms'))).toEqual([
      '当前节气：', `${j.current} ${j.currentStart}`, '下一节气：', `${j.next} ${j.nextStart}`, '元：', j.yuan, '符头：', j.fuTou,
    ]);
  });

  it('the footer carries the disclaimer', () => {
    expect(text(field(chartScreen(caseById('R1').input), 'footer'))).toBe('排盘内容仅供娱乐，请客观科学看待，抵制封建迷信');
  });

  it('has a heading for focus to land on after a cast, hidden as 玄天排盘 shows none', () => {
    const h1 = find(chartScreen(caseById('R1').input), (e) => e.tag === 'h1');
    expect([text(h1), h1.attrs.tabindex, hasClass(h1, 'visually-hidden')]).toEqual(['排盘结果', '-1', true]);
  });
});

describe('input screen', () => {
  it('shows the title, the date field in 玄天 format, the four fixed rows and both buttons', () => {
    const doc = inputScreen('1996-06-20T18:20');
    expect(text(find(doc, (e) => e.tag === 'h1'))).toBe('奇门排盘');
    expect(findAll(doc, (e) => hasClass(e, 'field')).map(text)).toEqual([
      '日期选择：1996年/06月/20日 18:20', '排盘方式：转盘', '定局：拆补法', '标记旬空：时空', '中宫寄宫：寄坤二宫',
    ]);
    expect(findAll(doc, (e) => e.tag === 'button' && hasClass(e, 'btn')).map(text)).toEqual(['点击起局', '重置时间']);
  });

  it('the date field is a button for the app’s own wheels: nothing on the screen asks iOS for a picker', () => {
    const doc = inputScreen('1996-06-20T18:20');
    const picker = find(doc, (e) => hasClass(e, 'picker'));
    expect([picker.tag, picker.attrs.type, picker.attrs['aria-haspopup']]).toEqual(['button', 'button', 'dialog']);
    expect(findAll(doc, (e) => e.tag === 'input' || e.tag === 'select')).toEqual([]);
    // The wheels stay shut until the field is tapped.
    expect(findAll(doc, (e) => e.attrs.role === 'dialog')).toEqual([]);
  });
});

describe('date picker', () => {
  const sheet = (value: string) => render(<DatePicker value={value} onCancel={noop} onConfirm={noop} />);
  const onLine = (doc: El) => findAll(doc, (e) => e.attrs['aria-selected'] === 'true').map(text);

  it('is a sheet with 取消, 公历 | 农历 and 确定 over five wheels, as in 玄天排盘', () => {
    const doc = sheet('2026-11-10T19:17');
    expect(find(doc, (e) => e.attrs.role === 'dialog').attrs).toMatchObject({ 'aria-modal': 'true', 'aria-label': '日期选择' });
    expect(findAll(doc, (e) => e.tag === 'button').map(text)).toEqual(['取消', '公历', '农历', '确定']);
    expect(findAll(doc, (e) => e.attrs.role === 'listbox').map((e) => e.attrs['aria-label'])).toEqual(['年', '月', '日', '时', '分']);
    expect(findAll(doc, (e) => e.tag === 'input' || e.tag === 'select')).toEqual([]);
  });

  it('opens in 公历 on the field’s time: 2026年 11月 10日 19时 17分', () => {
    const doc = sheet('2026-11-10T19:17');
    expect([field(doc, 'solar').attrs['aria-pressed'], field(doc, 'lunar').attrs['aria-pressed']]).toEqual(['true', 'false']);
    expect(onLine(doc)).toEqual(['2026年', '11月', '10日', '19时', '17分']);
  });

  it('lists every year from 1900 to 2100, and the days the month has', () => {
    const items = (doc: El, wheel: string) =>
      findAll(find(doc, (e) => e.attrs['data-wheel'] === wheel), (e) => e.attrs.role === 'option').map(text);
    const years = items(sheet('2026-11-10T19:17'), 'year');
    expect([years[0], years.at(-1), years.length]).toEqual(['1900年', '2100年', 201]);
    expect(items(sheet('2026-11-10T19:17'), 'day').at(-1)).toBe('30日');
    expect(items(sheet('2024-02-10T19:17'), 'day').at(-1)).toBe('29日');
  });
});

describe('the clock', () => {
  it('a clock reading becomes the field’s time', () => {
    expect(clockInput({ year: 2026, month: 11, day: 7, hour: 9, minute: 5 })).toBe('2026-11-07T09:05');
  });

  it('a clock set outside 1900–2100 is held to the nearest minute the field allows, so a cast still works', () => {
    expect(clockInput({ year: 2101, month: 1, day: 1, hour: 9, minute: 30 })).toBe('2100-12-31T23:59');
    expect(clockInput({ year: 1899, month: 12, day: 31, hour: 23, minute: 59 })).toBe('1900-01-01T00:00');
  });
});

describe('app state', () => {
  const start = initialState('1996-06-20T18:16');
  const cast = reducer(start, { type: 'cast', input: start.input });

  it('starts on the input screen with no chart, the field on the clock', () => {
    expect(start).toMatchObject({
      screen: 'input', input: '1996-06-20T18:16', followsClock: true, chart: null, termsOpen: false,
    });
  });

  it('cast opens the chart for the time the field shows, 节气 panel collapsed', () => {
    const s = reducer({ ...start, termsOpen: true }, { type: 'cast', input: start.input });
    expect(s.screen).toBe('chart');
    expect(s.chart?.header.solar).toBe('1996-06-20 18:16:00');
    expect(s.termsOpen).toBe(false);
  });

  it('back returns to the input screen with the cast time kept', () => {
    const s = reducer(cast, { type: 'back' });
    expect([s.screen, s.input, s.followsClock, s.chart]).toEqual(['input', '1996-06-20T18:16', false, cast.chart]);
  });

  it('setInput and reset change only the field', () => {
    expect(reducer(start, { type: 'setInput', value: '2026-11-04T08:00' }))
      .toEqual({ ...start, input: '2026-11-04T08:00', followsClock: false });
    expect(reducer({ ...start, followsClock: false }, { type: 'reset', now: '2026-11-04T16:05' }))
      .toEqual({ ...start, input: '2026-11-04T16:05' });
  });

  it('an untouched field keeps up with the clock; a time the user set or cast stays put', () => {
    const later = '1996-06-20T19:02';
    expect(reducer(start, { type: 'tick', now: later })).toEqual({ ...start, input: later });
    expect(reducer(start, { type: 'tick', now: start.input })).toBe(start);
    const set = reducer(start, { type: 'setInput', value: '2026-11-04T08:00' });
    expect(reducer(set, { type: 'tick', now: later })).toBe(set);
    const back = reducer(cast, { type: 'back' });
    expect(reducer(back, { type: 'tick', now: later })).toBe(back);
    const reset = reducer(back, { type: 'reset', now: '1996-06-20T18:30' });
    expect(reducer(reset, { type: 'tick', now: later }).input).toBe(later);
  });

  it('ignores a time that is not a real minute from 1900 to 2100, so a cast never throws', () => {
    for (const bad of ['2101-01-01T09:30', '1899-12-31T23:59', '2026-02-29T08:00', '']) {
      expect(reducer(start, { type: 'setInput', value: bad }), bad).toBe(start);
      expect(reducer(start, { type: 'reset', now: bad }), bad).toBe(start);
      expect(reducer(start, { type: 'tick', now: bad }), bad).toBe(start);
      expect(reducer(start, { type: 'cast', input: bad }), bad).toBe(start);
    }
  });

  it("open, after a reload, casts a chart history entry's time again", () => {
    const reloaded = initialState('2026-11-07T10:00');
    expect(reducer(reloaded, { type: 'open', input: '1996-06-20T18:16' })).toEqual(cast);
  });

  it('open, on Forward, shows the chart still held as it was, the field kept', () => {
    const open = reducer(cast, { type: 'toggleTerms' });
    const back = reducer(reducer(open, { type: 'back' }), { type: 'setInput', value: '2026-11-04T08:00' });
    const forward = reducer(back, { type: 'open', input: '1996-06-20T18:16' });
    expect(forward).toEqual({ ...back, screen: 'chart' });
    expect(forward.chart).toBe(cast.chart);
  });

  it('open shows the input screen for an entry it cannot read', () => {
    expect(reducer(cast, { type: 'open', input: '2101-01-01T00:00' }).screen).toBe('input');
  });

  it('toggleTerms opens and closes the 节气 panel', () => {
    const open = reducer(start, { type: 'toggleTerms' });
    expect([open.termsOpen, reducer(open, { type: 'toggleTerms' }).termsOpen]).toEqual([true, false]);
  });
});
