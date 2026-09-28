import {
  canPayDayPass,
  dayPassCreditSuccessMessage,
  dayPassDisplayName,
  estimateDayPassPayable,
  hydrateDayPassIdentity,
  normalizeDayPassStatus,
} from '../src/utils/dayPass';

describe('day pass identity', () => {
  it('uses the client name instead of showing an Other booking fallback', () => {
    expect(
      dayPassDisplayName({ name: '', company: 'Acme Private Limited' }),
    ).toBe('Acme Private Limited');
  });

  it('hydrates a day pass from the matching client record', () => {
    const pass = hydrateDayPassIdentity(
      {
        id: 'pass-1', customerId: 'client-1', name: '', email: '', phone: '', company: '',
        date: '2026-09-24', passType: 'Full Day', amount: 590, status: 'Issued',
        kycVerified: false, accessAreas: [],
      },
      {
        onDemandUsers: [], members: [],
        companies: [{
          id: 'client-1', name: 'Acme Private Limited', contactPerson: '',
          email: 'accounts@acme.test', phone: '9000000000', cabin: '', floor: '',
          status: 'Active', memberCount: 0, outstandingAmount: 0,
        }],
      },
    );
    expect(pass).toMatchObject({
      name: 'Acme Private Limited', company: 'Acme Private Limited',
      email: 'accounts@acme.test', phone: '9000000000',
    });
  });
});

describe('canPayDayPass', () => {
  it('offers payment only for an unpaid non-credit day pass', () => {
    expect(canPayDayPass({ status: 'Payment Pending', paymentMethod: 'razorpay' })).toBe(true);
    expect(canPayDayPass({ status: 'payment_pending' as never, paymentMethod: undefined })).toBe(true);
    expect(canPayDayPass({ status: 'Payment Pending', paymentMethod: 'credits' })).toBe(false);
    expect(canPayDayPass({ status: 'Active', paymentMethod: 'razorpay' })).toBe(false);
  });
});

describe('normalizeDayPassStatus', () => {
  it.each(['checked_in', 'Checked In', 'check-in', 'used', 'completed'])(
    'maps %s to Checked In',
    value => {
      expect(normalizeDayPassStatus(value)).toBe('Checked In');
    },
  );

  it.each(['no_show', 'No Show', 'noshow'])('maps %s to No Show', value => {
    expect(normalizeDayPassStatus(value)).toBe('No Show');
  });

  it.each([
    ['pending', 'Pending'],
    ['booked', 'Booked'],
    ['active', 'Active'],
    ['payment_pending', 'Payment Pending'],
    ['expired', 'Expired'],
    ['', 'Pending'],
    [undefined, 'Pending'],
  ])('formats backend status %s as %s', (value, expected) => {
    expect(normalizeDayPassStatus(value)).toBe(expected);
  });
});

describe('dayPassCreditSuccessMessage', () => {
  it('confirms a member credit purchase by name', () => {
    expect(dayPassCreditSuccessMessage('member', 'Nasir Ansari')).toBe(
      'The day pass for Nasir Ansari was purchased successfully using credits.',
    );
  });

  it('confirms the number of passes in a credit bundle', () => {
    expect(dayPassCreditSuccessMessage('bundle', 'Nasir Ansari', 5)).toBe(
      '5 day passes were purchased successfully using credits.',
    );
  });
});

describe('estimateDayPassPayable', () => {
  it('shows the observed tax-inclusive estimate until the order returns an exact amount', () => {
    expect(estimateDayPassPayable(472)).toBe(556.96);
    expect(estimateDayPassPayable(500)).toBe(590);
    expect(estimateDayPassPayable(0)).toBe(0);
  });
});
