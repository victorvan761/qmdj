// Inline SVG icons, so the UI needs no icon font and English mode no CJK glyphs.

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <path d="M15 4 7 12l8 8" {...stroke} />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg className="calendar-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" {...stroke} />
      <path d="M3.5 10h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" {...stroke} />
    </svg>
  );
}

/** ⌄⌄ pointing down (collapsed) or up (expanded). */
export function DoubleChevron({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"
      style={up ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="m5 6 7 6 7-6M5 12l7 6 7-6" {...stroke} />
    </svg>
  );
}
