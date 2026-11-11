// The input screen (SPEC §2): date-time picker, the four fixed settings, 点击起局 and 重置时间.
import { useEffect, useRef, useState, type Ref } from 'react';
import { MAX_YEAR, MIN_YEAR } from '../engine';
import { useFitText } from './fit';
import { CalendarIcon } from './icons';
import { readInput } from './state';

export interface InputScreenProps {
  /** 'YYYY-MM-DDTHH:mm', always a valid input */
  value: string;
  /** 点击起局, for focus to return to after going back */
  castRef?: Ref<HTMLButtonElement>;
  onChange(value: string): void;
  onCast(): void;
  onReset(): void;
}

const FIXED_ROWS = [
  ['排盘方式：', '转盘'],
  ['定局：', '拆补法'],
  ['标记旬空：', '时空'],
  ['中宫寄宫：', '寄坤二宫'],
] as const;

/** '1996-06-20T18:20' as 玄天排盘 prints it: 1996年/06月/20日 18:20. */
const pickerText = (value: string): string => value.replace(/^(\d+)-(\d+)-(\d+)T(.+)$/, '$1年/$2月/$3日 $4');

/**
 * The 玄天-style text sits under a transparent native datetime-local input, so a tap opens the system picker.
 * The native input keeps its own draft while a value is half typed; only complete, in-range values move up.
 * On a narrow phone the text shrinks to fit rather than losing the time to an ellipsis.
 */
function DatePicker({ value, onChange }: { value: string; onChange(v: string): void }) {
  const box = useRef<HTMLLabelElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const text = pickerText(value);
  useFitText(box, text);

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
        aria-label="日期选择"
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

export function InputScreen({ value, castRef, onChange, onCast, onReset }: InputScreenProps) {
  // 重置时间 starts a fresh native picker, dropping any half-typed draft even when the time is still the same minute.
  const [picker, setPicker] = useState(0);
  return (
    <div className="screen input-screen">
      <header className="band" />
      <main className="input-main">
        <section className="card input-card">
          <h1 className="title">奇门排盘</h1>
          <div className="fields">
            <div className="field">
              <span className="label">日期选择：</span>
              <DatePicker key={picker} value={value} onChange={onChange} />
            </div>
            {FIXED_ROWS.map(([label, val]) => (
              <div className="field" key={label}>
                <span className="label">{label}</span>
                <span className="value">{val}</span>
              </div>
            ))}
          </div>
        </section>
        <button type="button" className="btn primary" ref={castRef} onClick={onCast}>点击起局</button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setPicker((n) => n + 1);
            onReset();
          }}
        >
          重置时间
        </button>
      </main>
    </div>
  );
}
