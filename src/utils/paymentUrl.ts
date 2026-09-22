export type PaymentNavigationTarget = 'web' | 'external-app' | 'blocked';

const EXTERNAL_PAYMENT_SCHEMES = /^(upi|tez|phonepe|paytmmp|credpay|intent):/i;

export function getPaymentNavigationTarget(url: string): PaymentNavigationTarget {
  const normalized = url.trim();
  if (/^https:\/\//i.test(normalized) || normalized === 'about:blank') return 'web';
  if (EXTERNAL_PAYMENT_SCHEMES.test(normalized)) return 'external-app';
  return 'blocked';
}

export function isSecurePaymentUrl(url: string) {
  return /^https:\/\/[^\s]+$/i.test(url.trim());
}
