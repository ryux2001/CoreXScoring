export const USD_TO_EUR_RATE = 1.05;

export type Currency = 'USD' | 'EUR';

export function normalizeCurrency(value: string | null | undefined): Currency {
  return value?.toUpperCase() === 'EUR' ? 'EUR' : 'USD';
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertPrice(value: number, from: string, to: string): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;

  const sourceCurrency = normalizeCurrency(from);
  const targetCurrency = normalizeCurrency(to);

  if (sourceCurrency === targetCurrency) return roundCurrency(numericValue);

  return sourceCurrency === 'USD'
    ? roundCurrency(numericValue * USD_TO_EUR_RATE)
    : roundCurrency(numericValue / USD_TO_EUR_RATE);
}
