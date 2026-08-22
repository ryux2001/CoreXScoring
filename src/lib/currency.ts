export const USD_TO_EUR_RATE = 1.05;
export const CURRENCY_COOKIE_NAME = 'corex_currency';
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Currency = 'USD' | 'EUR';

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && ['USD', 'EUR'].includes(value.toUpperCase());
}

export function normalizeCurrency(value: unknown): Currency {
  return typeof value === 'string' && value.toUpperCase() === 'EUR' ? 'EUR' : 'USD';
}

/** Persist the display preference for subsequent navigations in this browser. */
export function setCurrencyPreference(currency: Currency): void {
  if (typeof document === 'undefined') return;

  document.cookie = [
    `${CURRENCY_COOKIE_NAME}=${encodeURIComponent(currency)}`,
    'Path=/',
    `Max-Age=${CURRENCY_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ].join('; ');
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
