// App state as a pure reducer, so what each action keeps is testable without a DOM.
import { castChart, parseInput, type Chart } from '../engine';
import { isLang, type Lang } from '../i18n';

export type Screen = 'input' | 'chart';

export interface AppState {
  lang: Lang;
  screen: Screen;
  /** The picker's value, 'YYYY-MM-DDTHH:mm' */
  input: string;
  /** The last cast chart; it stays when the language changes or the user goes back. */
  chart: Chart | null;
  termsOpen: boolean;
}

export type Action =
  | { type: 'setInput'; value: string }
  | { type: 'reset'; now: string }
  | { type: 'cast' }
  | { type: 'show'; screen: Screen }
  | { type: 'setLang'; lang: Lang }
  | { type: 'toggleTerms' };

export const initialState = (lang: Lang, now: string): AppState => ({
  lang,
  screen: 'input',
  input: now,
  chart: null,
  termsOpen: false,
});

/** A saved choice wins; otherwise zh-* → 中文, anything else → English (SPEC §4). */
export function initialLang(stored: string | null, deviceLang: string | undefined): Lang {
  if (isLang(stored)) return stored;
  return deviceLang?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setInput':
      return { ...state, input: action.value };
    case 'reset':
      return { ...state, input: action.now };
    case 'cast':
      return { ...state, chart: castChart(parseInput(state.input)), screen: 'chart', termsOpen: false };
    case 'show':
      return action.screen === 'chart' && !state.chart ? state : { ...state, screen: action.screen };
    case 'setLang':
      return { ...state, lang: action.lang };
    case 'toggleTerms':
      return { ...state, termsOpen: !state.termsOpen };
  }
}
