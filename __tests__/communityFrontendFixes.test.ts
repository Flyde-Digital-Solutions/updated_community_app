import {
  createCommunityIdempotencyKey,
  createDayPassPurchasePayload,
  dateFromDateTime,
  hydrateRoomBookingRelations,
  mergeCreatedDayPass,
  mergeBookingDetails,
  mergeEventSelections,
  normalizeBooking,
  resolveMemberCompanyNames,
  timeFromDateTime,
} from '../src/context/AppContext';
import { resolveDropdownSelection } from '../src/hooks/useEventFormOptions';
import { Company, Member } from '../src/types/domain';
import {
  normalizeRoomBookingStatus,
  resolveRoomBookingProfileTarget,
} from '../src/utils/roomBooking';
import { formatTimeRange } from '../src/utils/timeRange';
import {
  formatRecordValue,
  isHiddenRecordKey,
  isInternalIdentifierKey,
  looksLikeInternalIdentifier,
} from '../src/utils/displayRecord';

describe('Community frontend integration fixes', () => {
  it('never renders a dangling dash when a time range has no end time', () => {
    expect(formatTimeRange('10:00', '—')).toBe('10:00');
    expect(formatTimeRange('10:00', '11:00')).toBe('10:00 – 11:00');
    expect(formatTimeRange('', '')).toBe('Time unavailable');
  });

  it('maps backend room booking statuses to statuses supported by the Rooms screen', () => {
    expect(normalizeRoomBookingStatus('booked')).toBe('Confirmed');
    expect(normalizeRoomBookingStatus('pending_payment')).toBe(
      'Payment Pending',
    );
    expect(normalizeRoomBookingStatus('unexpected status')).toBe('Pending');
  });

  it('opens only an available profile for a meeting-room booking', () => {
    const relation = {
      memberId: 'missing-member',
      guestId: 'guest-1',
      clientId: 'company-1',
    };

    expect(
      resolveRoomBookingProfileTarget(
        relation,
        new Set(),
        new Set(['guest-1']),
        new Set(['company-1']),
      ),
    ).toEqual({ type: 'guest', id: 'guest-1' });
    expect(
      resolveRoomBookingProfileTarget(
        { memberId: 'missing-member', clientId: 'company-1' },
        new Set(),
        new Set(),
        new Set(['company-1']),
      ),
    ).toEqual({ type: 'company', id: 'company-1' });
    expect(
      resolveRoomBookingProfileTarget(
        relation,
        new Set(),
        new Set(),
        new Set(),
      ),
    ).toBeNull();
  });

  it('resolves member company IDs to company names', () => {
    const member = {
      id: 'member-1',
      name: 'Nasir Ansari',
      email: '',
      phone: '',
      role: '',
      companyId: '6a9aa2b20d22944f9664f744',
      company: '6a9aa2b20d22944f9664f744',
      cabin: '',
      floor: '',
      status: 'Active',
      kycVerified: false,
    } satisfies Member;
    const company = {
      id: '6a9aa2b20d22944f9664f744',
      name: 'Ofis Square',
      contactPerson: '',
      email: '',
      phone: '',
      cabin: '',
      floor: '',
      status: 'Active',
      memberCount: 1,
      outstandingAmount: 0,
    } satisfies Company;

    expect(resolveMemberCompanyNames([member], [company])[0].company).toBe(
      'Ofis Square',
    );
  });

  it('does not expose an unresolved database ID as a company name', () => {
    const member = {
      id: 'member-1',
      name: 'Nasir Ansari',
      email: '',
      phone: '',
      role: '',
      companyId: '6a9aa2b20d22944f9664f744',
      company: '6a9aa2b20d22944f9664f744',
      cabin: '',
      floor: '',
      status: 'Active',
      kycVerified: false,
    } satisfies Member;

    expect(resolveMemberCompanyNames([member], [])[0].company).toBe(
      'Company unavailable',
    );
  });

  it('recognizes internal relation fields without hiding meaningful card references', () => {
    expect(isInternalIdentifierKey('_id')).toBe(true);
    expect(isInternalIdentifierKey('company_id')).toBe(true);
    expect(isInternalIdentifierKey('clientId')).toBe(true);
    expect(isInternalIdentifierKey('bookingIds')).toBe(true);
    expect(isInternalIdentifierKey('paid')).toBe(false);
    expect(isInternalIdentifierKey('uid')).toBe(false);
  });

  it('recognizes opaque database identifiers in unexpected fields', () => {
    expect(looksLikeInternalIdentifier('6a9aa2b20d22944f9664f744')).toBe(true);
    expect(looksLikeInternalIdentifier('Ofis Square')).toBe(false);
  });

  it('hides private and implementation-only fields from record details', () => {
    expect(isHiddenRecordKey('qrToken')).toBe(true);
    expect(isHiddenRecordKey('backendStatus')).toBe(true);
    expect(isHiddenRecordKey('syncState')).toBe(true);
    expect(isHiddenRecordKey('status')).toBe(false);
  });

  it('formats raw API dates, statuses, booleans, and amounts for display', () => {
    expect(formatRecordValue('visitDate', '2026-09-17')).toBe('17 Sept 2026');
    expect(formatRecordValue('status', 'pending_checkin')).toBe('Pending Checkin');
    expect(formatRecordValue('isBookingClosed', false)).toBe('No');
    expect(formatRecordValue('amount', 472)).toBe('₹472');
  });

  it('converts UTC visitor dates to the corresponding IST calendar date', () => {
    expect(dateFromDateTime('2026-09-15T18:30:00.000Z')).toBe('2026-09-16');
  });

  it('converts UTC event times to IST', () => {
    expect(dateFromDateTime('2026-09-18T05:30:00.000Z')).toBe('2026-09-18');
    expect(timeFromDateTime('2026-09-18T05:30:00.000Z')).toBe('11:00');
    expect(timeFromDateTime('2026-09-18T06:30:00.000Z')).toBe('12:00');
  });

  it('preserves backend local date and time values that have no timezone', () => {
    expect(dateFromDateTime('2026-09-18 11:00')).toBe('2026-09-18');
    expect(timeFromDateTime('2026-09-18 11:00')).toBe('11:00');
  });

  it('normalizes populated walk-in guest details from meeting bookings', () => {
    const booking = normalizeBooking({
      _id: 'booking-1',
      room: {
        _id: 'room-1',
        name: '10-seater',
        floor: { name: '10th Floor' },
      },
      guestId: {
        _id: 'guest-1',
        name: 'Walk-in Guest',
        company: 'Guest Company',
      },
      start: '2026-09-17 10:00',
      end: '2026-09-17 11:00',
      status: 'confirmed',
    });

    expect(booking).toMatchObject({
      room: '10-seater',
      roomId: 'room-1',
      floor: '10th Floor',
      guestId: 'guest-1',
      memberName: 'Walk-in Guest',
      company: 'Guest Company',
    });
  });

  it('preserves selected guest details when a meeting-booking response omits them', () => {
    const incoming = normalizeBooking({
      _id: 'booking-1',
      room: { _id: 'room-1', name: '10-seater' },
      start: '2026-09-17 10:00',
      end: '2026-09-17 11:00',
      status: 'confirmed',
    });
    const merged = mergeBookingDetails(
      {
        guestId: 'guest-1',
        memberName: 'Walk-in Guest',
        company: 'Guest Company',
        floor: '10th Floor',
      },
      incoming,
    );

    expect(merged).toMatchObject({
      guestId: 'guest-1',
      memberName: 'Walk-in Guest',
      company: 'Guest Company',
      floor: '10th Floor',
    });
  });

  it('hydrates meeting-booking guest and room labels from related records', () => {
    const booking = normalizeBooking({
      _id: 'booking-1',
      room: 'room-1',
      guestId: 'guest-1',
      start: '2026-09-17 10:00',
      end: '2026-09-17 11:00',
      status: 'confirmed',
    });
    const hydrated = hydrateRoomBookingRelations(
      [booking],
      [],
      [
        {
          id: 'guest-1',
          name: 'Walk-in Guest',
          email: '',
          phone: '',
          company: 'Guest Company',
          createdAt: '',
        },
      ],
      [],
      [
        {
          id: 'room-1',
          name: '10-seater',
          floor: '10th Floor',
          capacity: 10,
          status: 'Available',
        },
      ],
    )[0];

    expect(hydrated).toMatchObject({
      room: '10-seater',
      floor: '10th Floor',
      memberName: 'Walk-in Guest',
      company: 'Guest Company',
    });
  });

  it('keeps event subcategory and speaker selections when the API omits them', () => {
    const savedEvent = {
      id: 'event-1',
      title: 'Community meetup',
      description: 'Monthly meetup',
      category: 'Community',
      categoryId: 'category-1',
      subcategory: 'Tech Talk',
      subcategoryId: 'subcategory-1',
      speaker: 'Kritika',
      speakerId: 'speaker-1',
      date: '2026-09-18',
      startTime: '11:00',
      endTime: '12:00',
      location: '10th Floor',
      capacity: 50,
      rsvpCount: 0,
      status: 'Draft' as const,
    };

    expect(
      mergeEventSelections(savedEvent, {
        ...savedEvent,
        subcategory: '',
        subcategoryId: undefined,
        speaker: 'Kritika',
        speakerId: undefined,
      }),
    ).toMatchObject({
      subcategory: 'Tech Talk',
      subcategoryId: 'subcategory-1',
      speaker: 'Kritika',
      speakerId: 'speaker-1',
    });
  });

  it('restores event selections by label when option IDs are absent or stale', () => {
    const options = [
      { value: 'speaker-new-id', label: 'Kritika' },
      { value: 'speaker-2', label: 'Another Speaker' },
    ];

    expect(resolveDropdownSelection(options, undefined, 'kritika')).toBe(
      'speaker-new-id',
    );
    expect(resolveDropdownSelection(options, 'speaker-old-id', 'Kritika')).toBe(
      'speaker-new-id',
    );
  });

  it('creates scoped idempotency keys for credit purchases', () => {
    expect(createCommunityIdempotencyKey('day-pass')).toMatch(
      /^community-mobile-day-pass-\d+-[a-z0-9]+$/,
    );
    expect(createCommunityIdempotencyKey('day-pass-bundle')).toMatch(
      /^community-mobile-day-pass-bundle-\d+-[a-z0-9]+$/,
    );
  });

  it('books a day pass for the selected customer rather than the community user', () => {
    const payload = createDayPassPurchasePayload(
      {
        customerId: 'customer-10f',
        buildingId: 'building-10f',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '7000000000',
        date: '2026-09-17',
        passType: 'Full Day',
        amount: 400,
        bookingFor: 'self',
        paymentMethod: 'credits',
        kycVerified: false,
        accessAreas: [],
      },
      'building-10f',
    );

    expect(payload).toMatchObject({
      customerId: 'customer-10f',
      buildingId: 'building-10f',
      bookingFor: 'other',
      paymentMethod: 'credits',
    });
  });

  it('books a member day pass using the documented customer and member relations', () => {
    const payload = createDayPassPurchasePayload(
      {
        customerId: 'member-10f',
        memberId: 'member-10f',
        purchaseType: 'member',
        name: 'Community Member',
        email: 'member@example.com',
        phone: '7000000001',
        company: 'Member Company',
        date: '2026-09-17',
        passType: 'Full Day',
        amount: 500,
        bookingFor: 'other',
        paymentMethod: 'credits',
        kycVerified: true,
        accessAreas: [],
      },
      'building-10f',
    );

    expect(payload).toMatchObject({
      customerId: 'member-10f',
      memberId: 'member-10f',
      buildingId: 'building-10f',
      bookingFor: 'other',
      paymentMethod: 'credits',
    });
    expect(payload).not.toHaveProperty('purchaseType');
  });

  it('keeps selected customer details when the create response only returns identifiers', () => {
    const input = {
      customerId: 'customer-10f',
      buildingId: 'building-10f',
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '7000000000',
      company: 'Test Company',
      date: '2026-09-17',
      passType: 'Full Day',
      amount: 400,
      bookingFor: 'other',
      paymentMethod: 'razorpay' as const,
      kycVerified: false,
      accessAreas: [],
    };
    const merged = mergeCreatedDayPass(input, {
      id: 'day-pass-1',
      customerId: 'customer-10f',
      name: '',
      email: '',
      phone: '',
      company: '',
      date: '2026-09-17',
      passType: '',
      amount: 472,
      status: 'Payment Pending',
      kycVerified: false,
      accessAreas: [],
      bookingFor: 'Other',
      syncState: 'synced',
    });

    expect(merged).toMatchObject({
      id: 'day-pass-1',
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '7000000000',
      company: 'Test Company',
      amount: 472,
    });
  });
});
