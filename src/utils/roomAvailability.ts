type Slot = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function timeMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23) || hour < (meridiem ? 1 : 0))
    return null;
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** The available-slots endpoint returns its intervals in `data` on the live API. */
export function selectedRoomAvailability(
  response: unknown,
  startHour: number,
  endHour: number,
): boolean | null {
  const root = asRecord(response);
  const data = root?.data;
  const body = asRecord(data) || root;
  if (!body && !Array.isArray(data) && !Array.isArray(response)) return null;
  if (root?.success === false) return null;
  const explicit = body?.available ?? root?.available;
  if (typeof explicit === 'boolean') return explicit;

  const slots = Array.isArray(data)
    ? data
    : Array.isArray(body?.availableSlots)
      ? body.availableSlots
      : Array.isArray(body?.slots)
        ? body.slots
        : Array.isArray(response)
          ? response
          : null;
  if (!slots) return null;

  const intervals = slots
    .map(slot => {
      const value = asRecord(slot) as Slot | null;
      if (!value || value.available === false) return null;
      const start = timeMinutes(value.startTime || value.start || value.from);
      const end = timeMinutes(value.endTime || value.end || value.to);
      return start != null && end != null && end > start
        ? { start, end }
        : null;
    })
    .filter((interval): interval is { start: number; end: number } => Boolean(interval))
    .sort((a, b) => a.start - b.start);
  let coveredUntil = startHour * 60;
  const requestedEnd = endHour * 60;
  for (const interval of intervals) {
    if (interval.start > coveredUntil) break;
    if (interval.end > coveredUntil) coveredUntil = interval.end;
    if (coveredUntil >= requestedEnd) return true;
  }
  return false;
}
