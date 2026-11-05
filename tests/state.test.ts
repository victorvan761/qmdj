// App state: what each action keeps and changes, and the starting language (SPEC §2, §4).
import { describe, expect, it } from 'vitest';
import { initialLang, initialState, reducer } from '../src/ui/state';

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

describe('reducer', () => {
  const start = initialState('zh', '1996-06-20T18:16');

  it('starts on the input screen with no chart', () => {
    expect(start).toMatchObject({ screen: 'input', input: '1996-06-20T18:16', chart: null, termsOpen: false });
  });

  it('cast opens the chart for the entered time, 节气 panel collapsed', () => {
    const s = reducer({ ...start, termsOpen: true }, { type: 'cast' });
    expect(s.screen).toBe('chart');
    expect(s.chart?.header.solar).toBe('1996-06-20 18:16:00');
    expect(s.termsOpen).toBe(false);
  });

  it('switching language keeps the entered time and the cast chart', () => {
    const cast = reducer(start, { type: 'cast' });
    const s = reducer(cast, { type: 'setLang', lang: 'en' });
    expect(s).toEqual({ ...cast, lang: 'en' });
  });

  it('back returns to the input screen with the time kept', () => {
    const s = reducer(reducer(start, { type: 'cast' }), { type: 'show', screen: 'input' });
    expect([s.screen, s.input]).toEqual(['input', '1996-06-20T18:16']);
  });

  it('forward to the chart works only once a chart exists', () => {
    expect(reducer(start, { type: 'show', screen: 'chart' })).toBe(start);
  });

  it('setInput and reset change only the picker', () => {
    expect(reducer(start, { type: 'setInput', value: '2026-11-04T08:00' }).input).toBe('2026-11-04T08:00');
    expect(reducer(start, { type: 'reset', now: '2026-11-04T16:05' })).toEqual({ ...start, input: '2026-11-04T16:05' });
  });

  it('toggleTerms opens and closes the 节气 panel', () => {
    const open = reducer(start, { type: 'toggleTerms' });
    expect([open.termsOpen, reducer(open, { type: 'toggleTerms' }).termsOpen]).toEqual([true, false]);
  });
});
