// App state: what each action keeps and changes, the clock and history inputs, and the starting language
// (SPEC §2, §4).
import { describe, expect, it } from 'vitest';
import { clockInput, initialLang, initialState, readInput, reducer } from '../src/ui/state';

describe('initialLang', () => {
  it('a saved choice wins over the device language', () => {
    expect(initialLang('en', 'zh-CN')).toBe('en');
    expect(initialLang('zh', 'en-US')).toBe('zh');
  });

  it('otherwise zh-* means 中文 and anything else English', () => {
    for (const l of ['zh', 'zh-CN', 'zh-Hans', 'zh-TW', 'ZH-HK']) expect(initialLang(null, l), l).toBe('zh');
    for (const l of ['en-US', 'fr-FR', 'ja', '', undefined]) expect(initialLang(null, l), String(l)).toBe('en');
  });

  it('ignores a saved value that is not a language', () => {
    expect(initialLang('klingon', 'zh-CN')).toBe('zh');
  });
});

describe('clockInput', () => {
  it('is the clock reading as a picker value', () => {
    expect(clockInput({ year: 2026, month: 11, day: 7, hour: 9, minute: 5 })).toBe('2026-11-07T09:05');
  });

  it('holds a clock set outside 1900–2100 to the nearest minute the picker allows, so a cast still works', () => {
    expect(clockInput({ year: 2101, month: 1, day: 1, hour: 9, minute: 30 })).toBe('2100-12-31T23:59');
    expect(clockInput({ year: 1899, month: 12, day: 31, hour: 23, minute: 59 })).toBe('1900-01-01T00:00');
  });
});

describe('readInput', () => {
  it('reads a real minute from 1900 to 2100, and nothing else', () => {
    expect(readInput('1996-06-20T18:16')).toEqual({ year: 1996, month: 6, day: 20, hour: 18, minute: 16 });
    for (const bad of ['2101-01-01T09:30', '1899-12-31T23:59', '2026-02-29T08:00', '1996-06-20T18:16:00', '', 'now']) {
      expect(readInput(bad), bad).toBeNull();
    }
  });
});

describe('reducer', () => {
  const start = initialState('zh', '1996-06-20T18:16');
  const cast = reducer(start, { type: 'cast', input: start.input });

  it('starts on the input screen with no chart, the picker on the clock', () => {
    expect(start).toMatchObject({
      screen: 'input', input: '1996-06-20T18:16', followsClock: true, chart: null, termsOpen: false,
    });
  });

  it('cast opens the chart for the time the picker shows, 节气 panel collapsed', () => {
    const s = reducer({ ...start, termsOpen: true }, { type: 'cast', input: start.input });
    expect(s.screen).toBe('chart');
    expect(s.chart?.header.solar).toBe('1996-06-20 18:16:00');
    expect(s.termsOpen).toBe(false);
  });

  it('switching language keeps the entered time and the cast chart', () => {
    expect(reducer(cast, { type: 'setLang', lang: 'en' })).toEqual({ ...cast, lang: 'en' });
  });

  it('back returns to the input screen with the cast time kept', () => {
    const s = reducer(cast, { type: 'back' });
    expect([s.screen, s.input, s.followsClock, s.chart]).toEqual(['input', '1996-06-20T18:16', false, cast.chart]);
  });

  it('setInput and reset change only the picker', () => {
    expect(reducer(start, { type: 'setInput', value: '2026-11-04T08:00' }))
      .toEqual({ ...start, input: '2026-11-04T08:00', followsClock: false });
    expect(reducer({ ...start, followsClock: false }, { type: 'reset', now: '2026-11-04T16:05' }))
      .toEqual({ ...start, input: '2026-11-04T16:05' });
  });

  it('an untouched picker keeps up with the clock; a time the user set or cast stays put', () => {
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
    const reloaded = initialState('zh', '2026-11-07T10:00');
    expect(reducer(reloaded, { type: 'open', input: '1996-06-20T18:16' })).toEqual(cast);
  });

  it('open, on Forward, shows the chart still held as it was, the picker kept', () => {
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
