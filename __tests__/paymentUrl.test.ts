import { getPaymentNavigationTarget, isSecurePaymentUrl } from '../src/utils/paymentUrl';

describe('payment URL handling', () => {
  it('keeps secure checkout pages inside the app', () => {
    expect(isSecurePaymentUrl('https://rzp.io/i/example')).toBe(true);
    expect(getPaymentNavigationTarget('https://api.razorpay.com/v1/checkout')).toBe('web');
    expect(getPaymentNavigationTarget('about:blank')).toBe('web');
  });

  it('allows supported payment apps to receive their own schemes', () => {
    expect(getPaymentNavigationTarget('upi://pay?pa=merchant@example')).toBe('external-app');
    expect(getPaymentNavigationTarget('phonepe://pay')).toBe('external-app');
    expect(getPaymentNavigationTarget('intent://pay')).toBe('external-app');
  });

  it('blocks insecure and unrelated schemes', () => {
    expect(isSecurePaymentUrl('http://example.com/pay')).toBe(false);
    expect(getPaymentNavigationTarget('http://example.com/pay')).toBe('blocked');
    expect(getPaymentNavigationTarget('javascript:alert(1)')).toBe('blocked');
    expect(getPaymentNavigationTarget('file:///tmp/payment.html')).toBe('blocked');
  });
});
