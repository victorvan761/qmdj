// The input screen (SPEC §2): the date field and its wheel picker, the four fixed settings, 点击起局 and 重置时间.
import { useEffect, useRef, useState, type Ref } from 'react';
import { DateSheet } from './DateSheet';
import { useFitText } from './fit';
import { CalendarIcon } from './icons';

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

export function InputScreen({ value, castRef, onChange, onCast, onReset }: InputScreenProps) {
  const [picking, setPicking] = useState(false);
  const field = useRef<HTMLButtonElement>(null);
  const text = pickerText(value);
  // On a narrow phone the text shrinks to fit rather than losing the time to an ellipsis.
  useFitText(field, text);

  // When the wheels close, focus goes back to the field that opened them.
  const wasPicking = useRef(false);
  useEffect(() => {
    if (wasPicking.current && !picking) field.current?.focus();
    wasPicking.current = picking;
  }, [picking]);

  return (
    <div className="screen input-screen">
      <header className="band" />
      {/* Behind the wheels the screen is out of reach, for the keyboard and screen readers too. */}
      <main className="input-main" inert={picking}>
        <section className="card input-card">
          <h1 className="title">奇门排盘</h1>
          <div className="fields">
            <div className="field">
              <span className="label" id="picker-label">日期选择：</span>
              {/* A tap opens the app's own wheels (DateSheet), never the system's date picker. */}
              <button
                type="button"
                className="picker"
                ref={field}
                aria-labelledby="picker-label picker-text"
                aria-haspopup="dialog"
                onClick={() => setPicking(true)}
              >
                <span className="picker-text" id="picker-text" data-k="picker" data-fit="">{text}</span>
                <CalendarIcon />
              </button>
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
        <button type="button" className="btn secondary" onClick={onReset}>重置时间</button>
      </main>
      {picking && (
        <DateSheet
          value={value}
          onCancel={() => setPicking(false)}
          onConfirm={(picked) => {
            setPicking(false);
            onChange(picked);
          }}
        />
      )}
    </div>
  );
}
