import type { Company, DayPass, Member, OnDemandUser } from '../types/domain';

type DayPassIdentitySources = {
  onDemandUsers: OnDemandUser[];
  members: Member[];
  companies: Company[];
};

export function hydrateDayPassIdentity(
  pass: DayPass,
  { onDemandUsers, members, companies }: DayPassIdentitySources,
): DayPass {
  const member = pass.memberId
    ? members.find(item => item.id === pass.memberId)
    : undefined;
  const customer = pass.customerId
    ? onDemandUsers.find(item => item.id === pass.customerId)
    : undefined;
  const company = companies.find(item =>
    item.id === pass.customerId || item.id === member?.companyId,
  );
  const person = member || customer;
  return {
    ...pass,
    name: pass.name || person?.name || company?.name || '',
    email: pass.email || person?.email || company?.email || '',
    phone: pass.phone || person?.phone || company?.phone || '',
    company:
      pass.company || member?.company || customer?.company || company?.name || '',
  };
}

export function dayPassDisplayName(
  pass: Pick<DayPass, 'name' | 'company'>,
) {
  return pass.name.trim() || pass.company?.trim() || 'Day pass booking';
}

// The live day-pass orders currently apply 18% tax to the configured base
// price. This is an on-screen estimate only; the order response remains the
// source of truth for the amount sent to Razorpay.
export function estimateDayPassPayable(baseAmount: number): number {
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) return 0;
  return Math.round(baseAmount * 1.18 * 100) / 100;
}

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

export function canPayDayPass(
  pass: Pick<DayPass, 'status' | 'paymentMethod'>,
): boolean {
  return normalizeDayPassStatus(pass.status) === 'Payment Pending' &&
    pass.paymentMethod !== 'credits';
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
