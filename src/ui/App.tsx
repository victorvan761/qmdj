// The two screens and the browser glue: language persistence, page language and title, focus, the clock and history.
// Each cast pushes one history entry holding its time, so the browser's or system's back gesture returns to the
// input screen like the back arrow, and Forward or a reload shows that chart again.
import { useEffect, useReducer, useRef } from 'react';
import { t, type Lang } from '../i18n';
import { ChartScreen } from './ChartScreen';
import { InputScreen } from './InputScreen';
import { reducer, type AppState } from './state';

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
  /** Called when the user picks a language, to remember it. */
  onLangChange?(lang: Lang): void;
}

export function App({ initial, now, onLangChange }: AppProps) {
  // A reload keeps the current history entry: on a chart's entry, show that chart again.
  const [state, dispatch] = useReducer(reducer, initial, (s) => {
    const time = entryTime(window.history.state);
    return time === null ? s : reducer(s, { type: 'open', input: time });
  });
  const { lang } = state;
  const castButton = useRef<HTMLButtonElement>(null);
  const chartHeading = useRef<HTMLHeadingElement>(null);
  const shownScreen = useRef(state.screen);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    document.title = t(lang, 'app.title');
  }, [lang]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const time = entryTime(e.state);
      dispatch(time === null ? { type: 'back' } : { type: 'open', input: time });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // An untouched picker keeps up with the clock (SPEC §2: it defaults to now): every second, and at once when the page
  // is shown again from another tab or the back-forward cache. Not while the picker has focus, so the time the user
  // is choosing doesn't change under them.
  useEffect(() => {
    if (!state.followsClock) return;
    const tick = () => {
      if (document.visibilityState === 'visible' && !(document.activeElement instanceof HTMLInputElement)) {
        dispatch({ type: 'tick', now: now() });
      }
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

  const setLang = (l: Lang) => {
    dispatch({ type: 'setLang', lang: l });
    onLangChange?.(l);
  };

  if (state.screen === 'chart' && state.chart) {
    return (
      <ChartScreen
        lang={lang}
        chart={state.chart}
        termsOpen={state.termsOpen}
        headingRef={chartHeading}
        onBack={() => {
          // Show the input screen first, so a quick second tap can't reach this button again and go back twice.
          dispatch({ type: 'back' });
          if (entryTime(window.history.state) !== null) window.history.back(); // leave the chart's entry too
        }}
        onToggleTerms={() => dispatch({ type: 'toggleTerms' })}
        onLang={setLang}
      />
    );
  }

  return (
    <InputScreen
      lang={lang}
      value={state.input}
      castRef={castButton}
      onChange={(value) => dispatch({ type: 'setInput', value })}
      onCast={() => {
        // Cast the time the picker shows, and keep it in the chart's entry for Forward and reload.
        dispatch({ type: 'cast', input: state.input });
        window.history.pushState({ [CHART_ENTRY]: state.input }, '');
        window.scrollTo(0, 0);
      }}
      onReset={() => dispatch({ type: 'reset', now: now() })}
      onLang={setLang}
    />
  );
}
