// The date picker (SPEC §2): a sheet of five wheels rising from the bottom, as in 玄天排盘. The app draws it itself,
// so it looks and works the same on every iPhone and iPad, whatever iOS does with its own pickers.
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { draftValue, openDraft, switchKind, turn, wheels, type CalendarKind, type Wheel, type WheelUnit } from './wheels';

export interface DateSheetProps {
  /** The time the wheels open on, 'YYYY-MM-DDTHH:mm' */
  value: string;
  onCancel(): void;
  /** 确定, with the time the wheels show */
  onConfirm(value: string): void;
}

const KINDS: readonly (readonly [CalendarKind, string])[] = [['solar', '公历'], ['lunar', '农历']];

/** How far a wheel can scroll: its first item is on the selection line at 0, its last at this. */
const travel = (el: HTMLElement) => el.scrollHeight - el.clientHeight;

/** How long a tapped row takes to roll to the selection line. */
const ROLL_MS = 220;

/**
 * Rolls a wheel to a position, easing out, and returns what stops it early. The app steps the scroll itself. iOS's
 * own smooth scrolling (scrollTo with behavior 'smooth') isn't used: after it, Safari goes on showing the wheel
 * where that scroll ended, whatever scrollTop is set to later, so a tapped wheel would stand a row off its item
 * once the other calendar or a shorter month moved it.
 */
function roll(el: HTMLElement, to: number, done: () => void): () => void {
  const from = el.scrollTop;
  let start = 0;
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    el.style.scrollSnapType = '';
    done();
  };
  const step = (now: number) => {
    start ||= now;
    const t = Math.min(1, (now - start) / ROLL_MS);
    el.scrollTop = from + (to - from) * (1 - (1 - t) ** 3);
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  // Between rows, snapping would pull each step back to the nearest one.
  el.style.scrollSnapType = 'none';
  frame = requestAnimationFrame(step);
  return stop;
}

/**
 * One wheel: a column that scrolls under the finger and comes to rest with an item on the selection line (CSS
 * scroll snap), so it has iOS's own momentum. Positions are read and set as a share of the whole travel, since a
 * row needn't be a whole number of pixels tall.
 */
const WheelColumn = memo(function WheelColumn({ unit, name, items, index, onTurn }: Wheel & {
  onTurn(unit: WheelUnit, value: number): void;
}) {
  const box = useRef<HTMLDivElement>(null);
  /** The item the wheel was last put on, by the finger or by the effect below. */
  const at = useRef(-1);
  /** Stops the roll a tap started, while one is under way. */
  const stopRoll = useRef<(() => void) | null>(null);
  const last = items.length - 1;
  const top = (el: HTMLElement, i: number) => (last > 0 ? (i / last) * travel(el) : 0);
  /** Puts the wheel on an item at once, ending any roll. */
  const put = (el: HTMLElement, i: number) => {
    stopRoll.current?.();
    el.scrollTop = top(el, i);
  };

  // Bring the wheel to its item when something else moved it there: opening, the other calendar, a shorter month.
  // Not when its own scrolling did, or setting the position would stop the wheel under the finger.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || at.current === index) return;
    at.current = index;
    put(el, index);
  }, [index, items]);

  // The rows change size with the screen: an iPad turned on its side, or sharing the screen with another app. The
  // wheel's position is in pixels, so put it back on its item rather than leave it between two, or on another.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      put(el, at.current);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => () => stopRoll.current?.(), []);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    // iOS scrolls a little past either end before springing back.
    const i = travel(el) > 0 ? Math.min(last, Math.max(0, Math.round((el.scrollTop / travel(el)) * last))) : 0;
    if (i === at.current) return;
    at.current = i;
    onTurn(unit, items[i].value);
  };

  // A tap on an item rolls the wheel to it; the scrolling reports each item it passes.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = box.current;
    const item = (e.target as HTMLElement).closest('.wheel-item');
    if (!el || !item) return;
    const i = [...el.children].indexOf(item);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return put(el, i);
    stopRoll.current?.();
    stopRoll.current = roll(el, top(el, i), () => (stopRoll.current = null));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const next = items[index + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0)];
    if (!next || next === items[index]) return;
    e.preventDefault();
    onTurn(unit, next.value);
  };

  return (
    <div
      className="wheel"
      ref={box}
      role="listbox"
      aria-label={name}
      tabIndex={0}
      data-wheel={unit}
      onScroll={onScroll}
      // A finger on the wheel takes it over from a roll.
      onPointerDown={() => stopRoll.current?.()}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {/* Rows are keyed by where they stand, not by what they say: when 农历 puts a leap month into the list, each
          row takes the next month's text and stays where it is. Keyed by value, the rows after the leap month
          would move down one, the browser would follow the row the wheel was resting on, and that scroll would
          be read as a turn to the next month. */}
      {items.map((item, i) => (
        <div key={i} className="wheel-item" role="option" aria-selected={i === index} data-value={item.value}>
          {item.text}
        </div>
      ))}
    </div>
  );
});

export function DateSheet({ value, onCancel, onConfirm }: DateSheetProps) {
  const [draft, setDraft] = useState(() => openDraft(value));
  const sheet = useRef<HTMLDivElement>(null);
  const onTurn = useCallback((unit: WheelUnit, to: number) => setDraft((d) => turn(d, unit, to)), []);

  // The screen behind can't be used while the sheet is up: move focus onto the sheet, as a new screen would.
  useEffect(() => sheet.current?.focus(), []);

  return (
    <div className="sheet-layer" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="sheet-backdrop" onClick={onCancel} />
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-label="日期选择" tabIndex={-1}>
        <div className="sheet-bar">
          <button type="button" className="sheet-action" data-k="cancel" onClick={onCancel}>取消</button>
          <div className="kinds">
            {KINDS.map(([kind, text]) => (
              <button
                key={kind}
                type="button"
                className="kind"
                data-k={kind}
                aria-pressed={draft.kind === kind}
                onClick={() => setDraft((d) => switchKind(d, kind))}
              >
                {text}
              </button>
            ))}
          </div>
          <button type="button" className="sheet-action confirm" data-k="confirm" onClick={() => onConfirm(draftValue(draft))}>
            确定
          </button>
        </div>
        <div className="wheels" data-k="wheels">
          {wheels(draft).map((wheel) => <WheelColumn key={wheel.unit} {...wheel} onTurn={onTurn} />)}
        </div>
      </div>
    </div>
  );
}
