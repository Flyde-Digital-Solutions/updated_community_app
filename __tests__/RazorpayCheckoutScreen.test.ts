import { buildRazorpayOptions, describeRazorpayError } from '../src/screens/RazorpayCheckoutScreen';

describe('native Razorpay checkout', () => {
  it('maps the backend order response to native SDK options', () => {
    expect(buildRazorpayOptions(
      { key: 'rzp_test_example', amount: 208152, orderId: 'order_example', description: 'Day pass' },
      { name: 'Test Customer', email: 'test@example.com', contact: '+919876543210' },
    )).toMatchObject({
      key: 'rzp_test_example',
      amount: 208152,
      currency: 'INR',
      order_id: 'order_example',
      description: 'Day pass',
      prefill: { name: 'Test Customer', email: 'test@example.com', contact: '+919876543210' },
    });
  });

  it('keeps the native failure details visible for diagnosis', () => {
    expect(describeRazorpayError({
      description: 'Payment failed', reason: 'payment_failed', step: 'payment_authentication', source: 'bank',
    })).toBe('Payment failed\npayment_failed · payment_authentication · bank');
  });

  it('turns Razorpay nested JSON failures into readable text', () => {
    expect(describeRazorpayError({
      description: JSON.stringify({ error: {
        code: 'BAD_REQUEST_ERROR', description: 'undefined', source: 'customer',
        step: 'payment_authentication', reason: 'payment_error', metadata: {},
      } }),
    })).toBe('The payment was cancelled or could not be completed.\npayment_error · payment_authentication · customer');
  });
});
