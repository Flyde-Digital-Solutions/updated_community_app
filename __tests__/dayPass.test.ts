import {
  dayPassCreditSuccessMessage,
  normalizeDayPassStatus,
} from '../src/utils/dayPass';

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
