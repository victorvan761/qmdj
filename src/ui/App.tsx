// The two screens and the browser glue: language persistence, page language and title, and one history entry
// per cast so the browser's or system's back gesture returns to the input screen like the back arrow.
import { useEffect, useReducer } from 'react';
import { t, type Lang } from '../i18n';
import { ChartScreen } from './ChartScreen';
import { InputScreen } from './InputScreen';
import { reducer, type AppState } from './state';

const CHART_ENTRY = 'qimen-chart';

export interface AppProps {
  initial: AppState;
  /** The device clock's current minute as 'YYYY-MM-DDTHH:mm' */
  now(): string;
  /** Called when the user picks a language, to remember it. */
  onLangChange?(lang: Lang): void;
}

export function App({ initial, now, onLangChange }: AppProps) {
  const [state, dispatch] = useReducer(reducer, initial);
  const { lang } = state;

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    document.title = t(lang, 'app.title');
  }, [lang]);

  useEffect(() => {
    // A reload keeps the current entry's state: if it was a chart entry, mark it as the input screen we now show,
    // or the next back would land on it and reopen the chart.
    if (window.history.state?.[CHART_ENTRY]) window.history.replaceState(null, '');
    const onPop = (e: PopStateEvent) =>
      dispatch({ type: 'show', screen: e.state?.[CHART_ENTRY] ? 'chart' : 'input' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
        onBack={() => {
          if (window.history.state?.[CHART_ENTRY]) window.history.back(); // popstate shows the input screen
          else dispatch({ type: 'show', screen: 'input' });
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
      onChange={(value) => dispatch({ type: 'setInput', value })}
      onCast={() => {
        dispatch({ type: 'cast' });
        window.history.pushState({ [CHART_ENTRY]: true }, '');
        window.scrollTo(0, 0);
      }}
      onReset={() => dispatch({ type: 'reset', now: now() })}
      onLang={setLang}
    />
  );
}
