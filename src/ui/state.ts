// App state as a pure reducer, so what each action keeps is testable without a DOM.
import { MAX_YEAR, MIN_YEAR, castChart, formatInput, parseInput, type Chart, type ChartInput } from '../engine';

export type Screen = 'input' | 'chart';

export interface AppState {
  screen: Screen;
  /** The picker's value, 'YYYY-MM-DDTHH:mm': always a real minute from 1900 to 2100, as the reducer checks */
  input: string;
  /** True while the picker shows the clock's time untouched (on load and after 重置时间), so it keeps up with it. */
  followsClock: boolean;
  /** The last cast chart; it stays when the user goes back. */
  chart: Chart | null;
  termsOpen: boolean;
}

export type Action =
  | { type: 'setInput'; value: string }
  | { type: 'reset'; now: string }
  /** The clock's current minute, for a picker the user hasn't touched */
  | { type: 'tick'; now: string }
  /** 点击起局, with the time the picker showed */
  | { type: 'cast'; input: string }
  /** A chart's history entry, on Forward or after a reload: the time it was cast for */
  | { type: 'open'; input: string }
  | { type: 'back' }
  | { type: 'toggleTerms' };

/** `now` must be a valid input, as clockInput gives. */
export const initialState = (now: string): AppState => ({
  screen: 'input',
  input: now,
  followsClock: true,
  chart: null,
  termsOpen: false,
});

/** The picker value for a clock reading. A clock set outside 1900–2100 gets the nearest minute the picker allows. */
export function clockInput(clock: ChartInput): string {
  if (clock.year < MIN_YEAR) return `${MIN_YEAR}-01-01T00:00`;
  if (clock.year > MAX_YEAR) return `${MAX_YEAR}-12-31T23:59`;
  return formatInput(clock);
}

/** The picker value as a ChartInput, or null unless it's a real minute from 1900 to 2100 (SPEC §2). */
export function readInput(value: string): ChartInput | null {
  try {
    return parseInput(value);
  } catch {
    return null;
  }
}

/** The picker value a chart was cast for: its 阳历 '1996-06-20 18:16:00' as '1996-06-20T18:16'. */
const inputOf = (chart: Chart) => chart.header.solar.slice(0, 16).replace(' ', 'T');

/** A new picker value, if it's valid. Every way into `input` goes through here or cast(), so casting can't throw. */
const pick = (state: AppState, input: string, followsClock: boolean): AppState =>
  readInput(input) ? { ...state, input, followsClock } : state;

/** The chart for input, which the picker then holds, 节气 panel collapsed; null if input isn't valid. */
function cast(state: AppState, input: string): AppState | null {
  const parsed = readInput(input);
  return parsed && { ...state, input, followsClock: false, chart: castChart(parsed), screen: 'chart', termsOpen: false };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setInput':
      return pick(state, action.value, false);
    case 'reset':
      return pick(state, action.now, true);
    case 'tick':
      return state.followsClock && action.now !== state.input ? pick(state, action.now, true) : state;
    case 'cast':
      return cast(state, action.input) ?? state;
    case 'open':
      // On Forward the chart is usually still here: show it as it was. After a reload, cast it again.
      if (state.chart && inputOf(state.chart) === action.input) return { ...state, screen: 'chart' };
      return cast(state, action.input) ?? { ...state, screen: 'input' };
    case 'back':
      return { ...state, screen: 'input' };
    case 'toggleTerms':
      return { ...state, termsOpen: !state.termsOpen };
  }
}
