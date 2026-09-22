import type { DayPass } from '../types/domain';

export function normalizeDayPassStatus(value: unknown): DayPass['status'] {
  const status = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (
    [
      'checked in',
      'check in',
      'checkedin',
      'checkin',
      'used',
      'completed',
    ].includes(status)
  ) {
    return 'Checked In';
  }

  if (['no show', 'noshow'].includes(status)) {
    return 'No Show';
  }

  if (!status) return 'Pending';

  return status.replace(/\b\w/g, character => character.toUpperCase());
}

export function dayPassCreditSuccessMessage(
  purchaseType: 'single' | 'bundle' | 'member',
  recipientName: string,
  passCount = 1,
) {
  if (purchaseType === 'bundle') {
    return `${passCount} day passes were purchased successfully using credits.`;
  }
  const recipient =
    recipientName.trim() ||
    (purchaseType === 'member'
      ? 'the selected member'
      : 'the selected customer');
  return `The day pass for ${recipient} was purchased successfully using credits.`;
}
