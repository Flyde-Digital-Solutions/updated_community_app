import type { PaymentOrderConfig } from '../types/domain';

type ApiRecord = Record<string, unknown>;

const asRecord = (value: unknown): ApiRecord | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as ApiRecord : undefined;

const firstValue = (records: Array<ApiRecord | undefined>, keys: string[]) => {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
  }
  return undefined;
};

const stringValue = (value: unknown) => typeof value === 'string' || typeof value === 'number'
  ? String(value).trim()
  : '';

const booleanValue = (value: unknown) => value === true || value === 1 || String(value).toLowerCase() === 'true';

/** Accept both the documented flat response and common nested Razorpay order wrappers. */
export const paymentOrderFrom = (payload: ApiRecord): PaymentOrderConfig | undefined => {
  const data = asRecord(payload.data) || payload;
  const config = asRecord(data.razorpayConfig)
    || asRecord(data.paymentConfig)
    || asRecord(data.checkout)
    || asRecord(payload.razorpayConfig);
  const primary = [config, data, payload];
  const orderRecords = [
    asRecord(config?.order),
    asRecord(data.order),
    asRecord(data.razorpayOrder),
    asRecord(data.orderDetails),
    asRecord(payload.order),
  ];

  const key = stringValue(firstValue(primary, [
    'razorpayKey', 'razorpay_key', 'razorpayKeyId', 'key', 'key_id', 'keyId',
  ]));
  const orderId = stringValue(
    firstValue(primary, ['order_id', 'orderId', 'razorpay_order_id', 'razorpayOrderId'])
      || firstValue(orderRecords, ['order_id', 'orderId', 'razorpay_order_id', 'razorpayOrderId', 'id']),
  );
  const amount = Number(
    firstValue(primary, ['amount', 'amountInPaise', 'amount_in_paise'])
      || firstValue(orderRecords, ['amount', 'amountInPaise', 'amount_in_paise'])
      || 0,
  );
  const description = stringValue(
    firstValue(primary, ['description', 'notes']) || firstValue(orderRecords, ['description']),
  );
  const noPaymentRequired = booleanValue(firstValue(primary, ['noPaymentRequired', 'no_payment_required']));

  if (noPaymentRequired) return { key, orderId, amount, description, noPaymentRequired };
  return key && orderId && Number.isFinite(amount) && amount > 0
    ? { key, orderId, amount, description }
    : undefined;
};
