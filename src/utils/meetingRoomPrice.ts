export function meetingRoomPayableAmount(
  hourlyRate: number | undefined,
  durationHours: number,
  discountPercent = 0,
) {
  if (!Number.isFinite(hourlyRate) || !hourlyRate || hourlyRate <= 0)
    return 0;
  if (!Number.isFinite(durationHours) || durationHours <= 0) return 0;
  const discount = Math.min(100, Math.max(0, discountPercent));
  const discountedBase = hourlyRate * durationHours * (1 - discount / 100);
  return Math.round(discountedBase * 1.18 * 100) / 100;
}

export function meetingRoomCreditAmount(
  creditPricePerHour: number | undefined,
  durationHours: number,
) {
  if (
    !Number.isFinite(creditPricePerHour) ||
    !creditPricePerHour ||
    creditPricePerHour <= 0 ||
    !Number.isFinite(durationHours) ||
    durationHours <= 0
  )
    return 0;
  return Math.round(creditPricePerHour * durationHours * 100) / 100;
}
