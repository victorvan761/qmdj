// The only place that touches the clock, the device language, localStorage and the service worker.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { clockInput, initialLang, initialState } from './ui/state';
import './ui/styles.css';

const LANG_KEY = 'qimen.lang';

function storedLang(): string | null {
  try {
    return window.localStorage.getItem(LANG_KEY);
  } catch {
    return null; // storage blocked: fall back to the device language
  }
}

function saveLang(lang: string): void {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // storage blocked: the choice lasts for this visit only
  }
}

/**
 * The device clock's wall time to the minute, held to 1900–2100. The engine reads it as Beijing time, unconverted
 * (SPEC §5 step 1).
 */
function now(): string {
  const d = new Date();
  return clockInput({
    year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(),
  });
}

// Keep a copy of the app on the device so it opens with no network (SPEC §11). Built site only: the dev server
// has no sw.js.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // no offline copy this visit: the app still works online
  });
}

const lang = initialLang(storedLang(), navigator.language);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initial={initialState(lang, now())} now={now} onLangChange={saveLang} />
  </StrictMode>,
);
