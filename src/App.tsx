// The app: what it remembers, as a pure reducer, and the browser glue around its two screens (history, clock, focus).
import { useEffect, useReducer, useRef } from 'react';
import { ChartScreen } from './ChartScreen';
import { MAX_YEAR, MIN_YEAR, castChart, formatInput, parseInput, type Chart, type ChartInput } from './engine';
import { InputScreen } from './InputScreen';

// ── What the app remembers ───────────────────────────────────────────────────────────────────────────────────
// A reducer with no DOM in it, so what each action keeps and changes can be tested.

export interface AppState {
  screen: 'input' | 'chart';
  /** The date field's time, 'YYYY-MM-DDTHH:mm': always a real minute from 1900 to 2100, as the reducer checks */
  input: string;
  /** True while the field shows the clock's time untouched (on load and after 重置时间), so it keeps up with it */
  followsClock: boolean;
  /** The last cast chart; it stays when the user goes back */
  chart: Chart | null;
  /** Whether the chart's 节气 panel is open */
  termsOpen: boolean;
}

export type Action =
  /** A time confirmed in the date picker */
  | { type: 'setInput'; value: string }
  /** 重置时间 */
  | { type: 'reset'; now: string }
  /** The clock's current minute, for a field the user hasn't touched */
  | { type: 'tick'; now: string }
  /** 点击起局, with the time the field showed */
  | { type: 'cast'; input: string }
  /** A chart's history entry, on Forward or after a reload: the time it was cast for */
  | { type: 'open'; input: string }
  | { type: 'back' }
  | { type: 'toggleTerms' };

/** `now` must be a real minute from 1900 to 2100, as clockInput gives. */
export const initialState = (now: string): AppState => ({
  screen: 'input',
  input: now,
  followsClock: true,
  chart: null,
  termsOpen: false,
});

/** A clock reading as the field's time. A clock set outside 1900–2100 gets the nearest minute the field allows. */
export function clockInput(clock: ChartInput): string {
  if (clock.year < MIN_YEAR) return `${MIN_YEAR}-01-01T00:00`;
  if (clock.year > MAX_YEAR) return `${MAX_YEAR}-12-31T23:59`;
  return formatInput(clock);
}

/** The time a chart was cast for: its 阳历 '1996-06-20 18:16:00' as '1996-06-20T18:16'. */
const inputOf = (chart: Chart) => chart.header.solar.slice(0, 16).replace(' ', 'T');

/** A new time for the field, if it is a real one. Every way into `input` is through here or cast(), so a cast can't throw. */
const pick = (state: AppState, input: string, followsClock: boolean): AppState =>
  parseInput(input) ? { ...state, input, followsClock } : state;

/** The chart for a time, which the field then holds, 节气 panel collapsed; null if the time isn't a real one. */
function cast(state: AppState, input: string): AppState | null {
  const time = parseInput(input);
  return time && { ...state, input, followsClock: false, chart: castChart(time), screen: 'chart', termsOpen: false };
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

// ── The two screens, and the browser around them ─────────────────────────────────────────────────────────────
// Each cast pushes one history entry holding its time, so the browser's or system's back gesture returns to the
// input screen like the back arrow, and Forward or a reload shows that chart again.

const CHART_ENTRY = 'qimen-chart';

/** The time a history entry's chart was cast for, or null for the input screen's entry. */
function entryTime(entry: unknown): string | null {
  const time = (entry as Record<string, unknown> | null)?.[CHART_ENTRY];
  return typeof time === 'string' ? time : null;
}

export interface AppProps {
  initial: AppState;
  /** The device clock's current minute as 'YYYY-MM-DDTHH:mm' */
  now(): string;
}

export function App({ initial, now }: AppProps) {
  // A reload keeps the current history entry: on a chart's entry, show that chart again.
  const [state, dispatch] = useReducer(reducer, initial, (s) => {
    const time = entryTime(window.history.state);
    return time === null ? s : reducer(s, { type: 'open', input: time });
  });
  const castButton = useRef<HTMLButtonElement>(null);
  const chartHeading = useRef<HTMLHeadingElement>(null);
  const shownScreen = useRef(state.screen);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const time = entryTime(e.state);
      dispatch(time === null ? { type: 'back' } : { type: 'open', input: time });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // An untouched field keeps up with the clock (SPEC §2: it defaults to now): every second, and at once when the page
  // is shown again from another tab or the back-forward cache. Open wheels hold the time they opened on, so the time
  // the user is choosing doesn't change under them.
  useEffect(() => {
    if (!state.followsClock) return;
    const tick = () => {
      if (document.visibilityState === 'visible') dispatch({ type: 'tick', now: now() });
    };
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('pageshow', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, [state.followsClock, now]);

  // Each screen replaces the other, taking the focused button with it. Move focus onto the new screen, as a page load
  // would: to the chart's heading after a cast, to 点击起局 after going back. The first screen leaves focus alone.
  useEffect(() => {
    if (shownScreen.current === state.screen) return;
    shownScreen.current = state.screen;
    (state.screen === 'chart' ? chartHeading : castButton).current?.focus();
  }, [state.screen]);

  if (state.screen === 'chart' && state.chart) {
    return (
      <ChartScreen
        chart={state.chart}
        termsOpen={state.termsOpen}
        headingRef={chartHeading}
        onBack={() => {
          // Show the input screen first, so a quick second tap can't reach this button again and go back twice.
          dispatch({ type: 'back' });
          if (entryTime(window.history.state) !== null) window.history.back(); // leave the chart's entry too
        }}
        onToggleTerms={() => dispatch({ type: 'toggleTerms' })}
      />
    );
  }

  return (
    <InputScreen
      value={state.input}
      castRef={castButton}
      onChange={(value) => dispatch({ type: 'setInput', value })}
      onCast={() => {
        // Cast the time the field shows, and keep it in the chart's entry for Forward and reload.
        dispatch({ type: 'cast', input: state.input });
        window.history.pushState({ [CHART_ENTRY]: state.input }, '');
        window.scrollTo(0, 0);
      }}
      onReset={() => dispatch({ type: 'reset', now: now() })}
    />
  );
}
