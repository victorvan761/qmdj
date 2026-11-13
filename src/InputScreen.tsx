// The input screen (SPEC §2): the date field and its wheel picker, the four fixed settings, 点击起局 and 重置时间.
import { useEffect, useLayoutEffect, useRef, useState, type Ref, type RefObject } from 'react';
import { DatePicker } from './DatePicker';

/** 玄天排盘 offers choices here. This app has one of each, so the rows are read-only. */
const FIXED_ROWS = [
  ['排盘方式：', '转盘'],
  ['定局：', '拆补法'],
  ['标记旬空：', '时空'],
  ['中宫寄宫：', '寄坤二宫'],
] as const;

/** '1996-06-20T18:20' as 玄天排盘 prints it: 1996年/06月/20日 18:20. */
const fieldText = (value: string): string => value.replace(/^(\d+)-(\d+)-(\d+)T(.+)$/, '$1年/$2月/$3日 $4');

const MIN_FONT_PX = 10;

/**
 * Shrinks an element's text until it fits its box, down to 10 px: on a phone narrower than 390 px the date field
 * shows the whole time rather than losing the end of it to an ellipsis.
 */
function useFitText(ref: RefObject<HTMLElement | null>, text: string): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '';
      if (el.scrollWidth <= el.clientWidth) return;
      const base = parseFloat(getComputedStyle(el).fontSize);
      // Overflowing text is start-aligned, so scrollWidth is the full content width: scale once, then nudge.
      let size = Math.max(MIN_FONT_PX, Math.floor(((base * el.clientWidth) / el.scrollWidth) * 2) / 2);
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth && size > MIN_FONT_PX) {
        size = Math.max(MIN_FONT_PX, size - 0.5);
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    // And again whenever the field around it changes size.
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    return () => observer.disconnect();
  }, [ref, text]);
}

function CalendarIcon() {
  return (
    <svg className="icon calendar-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" />
    </svg>
  );
}

export interface InputScreenProps {
  /** The chosen minute as 'YYYY-MM-DDTHH:mm', always a real one from 1900 to 2100 */
  value: string;
  /** 点击起局, for focus to return to after going back */
  castRef?: Ref<HTMLButtonElement>;
  /** A time confirmed in the date picker */
  onChange(value: string): void;
  onCast(): void;
  onReset(): void;
}

export function InputScreen({ value, castRef, onChange, onCast, onReset }: InputScreenProps) {
  const [picking, setPicking] = useState(false);
  const field = useRef<HTMLButtonElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const text = fieldText(value);
  useFitText(time, text);

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
              {/* A tap opens the app's own wheels (DatePicker), never the system's date picker. */}
              <button
                type="button"
                className="picker"
                ref={field}
                aria-labelledby="picker-label picker-text"
                aria-haspopup="dialog"
                onClick={() => setPicking(true)}
              >
                <span className="picker-text" id="picker-text" data-k="picker" ref={time}>{text}</span>
                <CalendarIcon />
              </button>
            </div>
            {FIXED_ROWS.map(([label, setting]) => (
              <div className="field" key={label}>
                <span className="label">{label}</span>
                <span className="value">{setting}</span>
              </div>
            ))}
          </div>
        </section>
        <button type="button" className="btn primary" ref={castRef} onClick={onCast}>点击起局</button>
        <button type="button" className="btn secondary" onClick={onReset}>重置时间</button>
      </main>
      {picking && (
        <DatePicker
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
