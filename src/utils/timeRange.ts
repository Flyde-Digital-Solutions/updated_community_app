const EMPTY_TIME_VALUES = new Set(['', '-', '—', '–', 'n/a', 'na', 'null', 'undefined']);

export function cleanTimeLabel(value: unknown): string {
  const label = String(value ?? '').trim();
  return EMPTY_TIME_VALUES.has(label.toLowerCase()) ? '' : label;
}

export function formatTimeRange(start: unknown, end: unknown, fallback = 'Time unavailable'): string {
  const startLabel = cleanTimeLabel(start);
  const endLabel = cleanTimeLabel(end);

  if (startLabel && endLabel && startLabel !== endLabel) return `${startLabel} – ${endLabel}`;
  return startLabel || endLabel || fallback;
}
