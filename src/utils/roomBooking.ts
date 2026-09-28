import { Company, Member, RoomBooking } from '../types/domain';
import { looksLikeInternalIdentifier } from './displayRecord';

export function roomBookingCompanyName(
  booking: Pick<RoomBooking, 'company' | 'clientId' | 'memberId'>,
  companies: Pick<Company, 'id' | 'name'>[],
  members: Pick<Member, 'id' | 'company' | 'companyId'>[],
): string {
  const member = members.find(item => item.id === booking.memberId);
  const company = companies.find(item =>
    item.id === booking.clientId ||
    item.id === booking.company ||
    item.id === member?.companyId,
  );
  if (company?.name) return company.name;
  if (member?.company && !looksLikeInternalIdentifier(member.company))
    return member.company;
  return looksLikeInternalIdentifier(booking.company) ? '' : booking.company;
}

export function canPayRoomBooking(
  booking: Pick<RoomBooking, 'status' | 'paymentMethod'>,
): boolean {
  return normalizeRoomBookingStatus(booking.status) === 'Payment Pending' &&
    booking.paymentMethod !== 'credits';
}

export type RoomBookingProfileTarget = {
  type: 'member' | 'guest' | 'company';
  id: string;
};

export function resolveRoomBookingProfileTarget(
  booking: Pick<RoomBooking, 'memberId' | 'guestId' | 'clientId'>,
  memberIds: Set<string>,
  guestIds: Set<string>,
  companyIds: Set<string>,
): RoomBookingProfileTarget | null {
  if (booking.guestId && guestIds.has(booking.guestId)) {
    return { type: 'guest', id: booking.guestId };
  }
  if (booking.memberId && memberIds.has(booking.memberId)) {
    return { type: 'member', id: booking.memberId };
  }
  if (booking.clientId && companyIds.has(booking.clientId)) {
    return { type: 'company', id: booking.clientId };
  }
  return null;
}

export function normalizeRoomBookingStatus(
  value: unknown,
): RoomBooking['status'] {
  const status = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (['booked', 'reserved', 'approved', 'confirmed'].includes(status))
    return 'Confirmed';
  if (['in progress', 'checked in', 'ongoing'].includes(status))
    return 'In Progress';
  if (['completed', 'complete', 'finished'].includes(status))
    return 'Completed';
  if (['cancelled', 'canceled', 'rejected'].includes(status))
    return 'Cancelled';
  if (status === 'approval pending' || status === 'pending approval')
    return 'Approval Pending';
  if (status === 'payment pending' || status === 'pending payment')
    return 'Payment Pending';
  return 'Pending';
}
