import { resolveMonthlyRevenue } from '../src/utils/dashboard';

describe('resolveMonthlyRevenue', () => {
  it('reads the documented nested dashboard metric after response flattening', () => {
    expect(resolveMonthlyRevenue({ 'metrics.monthlyRevenue.value': 125000 })).toBe(125000);
  });

  it('accepts the backend mail snake-case field for compatibility', () => {
    expect(resolveMonthlyRevenue({ monthly_revenue: 98000 })).toBe(98000);
  });

  it('preserves a legitimate zero value', () => {
    expect(resolveMonthlyRevenue({ 'metrics.monthlyRevenue.value': 0 })).toBe(0);
  });

  it('reports an unavailable value when the backend omits the metric', () => {
    expect(resolveMonthlyRevenue({ occupancyRate: 73 })).toBeUndefined();
  });
});
