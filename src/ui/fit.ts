// Text that overflows its box shrinks to fit, down to 10 px: the date picker on phones narrower than 390 px
// (SPEC §2).
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

/** Fits every [data-fit] element inside root: when key changes, and again whenever root changes size. */
export function useFitText(root: RefObject<HTMLElement | null>, key: unknown): void {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const run = () => el.querySelectorAll<HTMLElement>('[data-fit]').forEach(fit);
    run();
    const observer = new ResizeObserver(run);
    observer.observe(el);
    return () => observer.disconnect();
  }, [root, key]);
}
