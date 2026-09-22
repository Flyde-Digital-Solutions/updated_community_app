export function resolveMonthlyRevenue(summary: Record<string, number>): number | undefined {
  const candidates = ['metricsmonthlyrevenuevalue', 'monthlyrevenuevalue', 'monthlyrevenue'];
  const match = Object.entries(summary).find(([key]) => {
    const normalized = key.toLowerCase().replace(/[_\s.-]/g, '');
    return candidates.some(candidate => normalized === candidate || normalized.endsWith(candidate));
  });

  return match?.[1];
}
