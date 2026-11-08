// Text that overflows its box shrinks to fit, down to 10 px: English grid labels, which run longer than 中文
// (SPEC §4), and the date picker on narrow phones.
import { useLayoutEffect, type RefObject } from 'react';

export const MIN_FONT_PX = 10;

/** Shrinks el's font size until its content fits its box, never below MIN_FONT_PX. */
export function fit(el: HTMLElement): void {
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
}

/** Fits every [data-fit] element inside root while active, and again whenever root changes size. */
export function useFitText(root: RefObject<HTMLElement | null>, active: boolean, key: unknown): void {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const targets = () => el.querySelectorAll<HTMLElement>('[data-fit]');
    if (!active) {
      targets().forEach((t) => t.style.removeProperty('font-size'));
      return;
    }
    const run = () => targets().forEach(fit);
    run();
    const observer = new ResizeObserver(run);
    observer.observe(el);
    return () => observer.disconnect();
  }, [root, active, key]);
}
