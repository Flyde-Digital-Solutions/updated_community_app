import { paymentOrderFrom } from '../src/utils/razorpay';

describe('paymentOrderFrom', () => {
  it('parses the documented flat order response', () => {
    expect(paymentOrderFrom({
      data: {
        razorpayKey: 'rzp_test_flat', amount: 47200, order_id: 'order_flat', description: 'Day pass',
      },
    })).toEqual({ key: 'rzp_test_flat', amount: 47200, orderId: 'order_flat', description: 'Day pass' });
  });

  it('parses an order object with the checkout key alongside it', () => {
    expect(paymentOrderFrom({
      data: {
        keyId: 'rzp_test_nested',
        order: { id: 'order_nested', amount: 47200 },
      },
    })).toEqual({ key: 'rzp_test_nested', amount: 47200, orderId: 'order_nested', description: '' });
  });

  it('does not treat the string false as no-payment-required', () => {
    const result = paymentOrderFrom({
      razorpayKey: 'rzp_test_value', orderId: 'order_value', amount: '47200', noPaymentRequired: 'false',
    });
    expect(result).toMatchObject({ orderId: 'order_value' });
    expect(result).not.toHaveProperty('noPaymentRequired');
  });
});
