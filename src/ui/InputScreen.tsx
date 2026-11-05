// The input screen (SPEC §2): date-time picker, the four fixed settings, 点击起局 and 重置时间.
import { useEffect, useRef, useState } from 'react';
import { MAX_YEAR, MIN_YEAR, parseInput, type ChartInput } from '../engine';
import { pickerDate, t, type Lang, type UiKey } from '../i18n';
import { CalendarIcon } from './icons';
import { LangToggle } from './LangToggle';

export interface InputScreenProps {
  lang: Lang;
  /** 'YYYY-MM-DDTHH:mm', always a valid input */
  value: string;
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

const valid = (v: string): ChartInput | null => {
  try {
    return parseInput(v);
  } catch {
    return null;
  }
};

/**
 * The 玄天-style text sits under a transparent native datetime-local input, so a tap opens the system picker.
 * The native input keeps its own draft while a value is half typed; only complete, in-range values move up.
 */
function DatePicker({ lang, value, onChange }: { lang: Lang; value: string; onChange(v: string): void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const shown = valid(value);

  return (
    <label className="picker">
      <span className="picker-text" data-k="picker">{shown ? pickerDate(lang, shown) : value}</span>
      <CalendarIcon />
      <input
        ref={ref}
        type="datetime-local"
        value={draft}
        min={`${MIN_YEAR}-01-01T00:00`}
        max={`${MAX_YEAR}-12-31T23:59`}
        step={60}
        aria-label={t(lang, 'input.date')}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = e.target.value.slice(0, 16); // some browsers add :ss
          if (valid(v)) onChange(v);
        }}
        onClick={() => {
          try {
            ref.current?.showPicker(); // desktop browsers otherwise only focus a segment
          } catch {
            // not supported, or already open
          }
        }}
      />
    </label>
  );
}

export function InputScreen({ lang, value, onChange, onCast, onReset, onLang }: InputScreenProps) {
  const colon = t(lang, 'colon');
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
              <DatePicker lang={lang} value={value} onChange={onChange} />
            </div>
            {FIXED_ROWS.map(([label, val]) => (
              <div className="field" key={label}>
                <span className="label">{`${t(lang, label)}${colon}`}</span>
                <span className="value">{t(lang, val)}</span>
              </div>
            ))}
          </div>
        </section>
        <button type="button" className="btn primary" onClick={onCast}>{t(lang, 'input.cast')}</button>
        <button type="button" className="btn secondary" onClick={onReset}>{t(lang, 'input.reset')}</button>
      </main>
    </div>
  );
}
