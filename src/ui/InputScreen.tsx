// The input screen (SPEC §2): date-time picker, the four fixed settings, 点击起局 and 重置时间.
import { useEffect, useRef, useState, type Ref } from 'react';
import { MAX_YEAR, MIN_YEAR } from '../engine';
import { pickerDate, t, type Lang, type UiKey } from '../i18n';
import { useFitText } from './fit';
import { CalendarIcon } from './icons';
import { LangToggle } from './LangToggle';
import { readInput } from './state';

export interface InputScreenProps {
  lang: Lang;
  /** 'YYYY-MM-DDTHH:mm', always a valid input */
  value: string;
  /** 点击起局, for focus to return to after going back */
  castRef?: Ref<HTMLButtonElement>;
  onChange(value: string): void;
  onCast(): void;
  onReset(): void;
  onLang(lang: Lang): void;
}

const FIXED_ROWS: [UiKey, UiKey][] = [
  ['input.method', 'input.method.value'],
  ['input.dingju', 'input.dingju.value'],
  ['input.void', 'input.void.value'],
  ['input.lodge', 'input.lodge.value'],
];

/**
 * The 玄天-style text sits under a transparent native datetime-local input, so a tap opens the system picker.
 * The native input keeps its own draft while a value is half typed; only complete, in-range values move up.
 * On a narrow phone the text shrinks to fit rather than losing the time to an ellipsis.
 */
function DatePicker({ lang, value, onChange }: { lang: Lang; value: string; onChange(v: string): void }) {
  const box = useRef<HTMLLabelElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const shown = readInput(value);
  const text = shown ? pickerDate(lang, shown) : value;
  useFitText(box, true, text);

  return (
    <label className="picker" ref={box}>
      <span className="picker-text" data-k="picker" data-fit="">{text}</span>
      <CalendarIcon />
      <input
        ref={input}
        type="datetime-local"
        value={draft}
        min={`${MIN_YEAR}-01-01T00:00`}
        max={`${MAX_YEAR}-12-31T23:59`}
        step={60}
        aria-label={t(lang, 'input.date')}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = e.target.value.slice(0, 16); // some browsers add :ss
          if (readInput(v)) onChange(v);
        }}
        onClick={() => {
          try {
            input.current?.showPicker(); // desktop browsers otherwise only focus a segment
          } catch {
            // not supported, or already open
          }
        }}
      />
    </label>
  );
}

export function InputScreen({ lang, value, castRef, onChange, onCast, onReset, onLang }: InputScreenProps) {
  const colon = t(lang, 'colon');
  // 重置时间 starts a fresh native picker, dropping any half-typed draft even when the time is still the same minute.
  const [picker, setPicker] = useState(0);
  return (
    <div className={`screen input-screen lang-${lang}`}>
      <header className="band">
        <span />
        <LangToggle lang={lang} onLang={onLang} />
      </header>
      <main className="input-main">
        <section className="card input-card">
          <h1 className="title">{t(lang, 'app.title')}</h1>
          <div className="fields">
            <div className="field date">
              <span className="label">{`${t(lang, 'input.date')}${colon}`}</span>
              <DatePicker key={picker} lang={lang} value={value} onChange={onChange} />
            </div>
            {FIXED_ROWS.map(([label, val]) => (
              <div className="field" key={label}>
                <span className="label">{`${t(lang, label)}${colon}`}</span>
                <span className="value">{t(lang, val)}</span>
              </div>
            ))}
          </div>
        </section>
        <button type="button" className="btn primary" ref={castRef} onClick={onCast}>{t(lang, 'input.cast')}</button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setPicker((n) => n + 1);
            onReset();
          }}
        >
          {t(lang, 'input.reset')}
        </button>
      </main>
    </div>
  );
}
