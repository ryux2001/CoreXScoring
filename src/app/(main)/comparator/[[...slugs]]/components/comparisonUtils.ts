import { convertPrice } from '@/lib/currency';
import { getComboPartPrice as getStoredComboPartPrice } from '@/lib/scoringCombos';

export type ComparisonMode = 'components' | 'combos';
export type ComboPartKey = 'cpu' | 'gpu' | 'ram';

export type ComboPriceOverrides = Partial<Record<ComboPartKey, number>>;

export function isComboItem(item: any): boolean {
  return item?.comparisonType === 'combo' || String(item?.type || '').toUpperCase() === 'COMBO';
}

export function getProductPrice(product: any, currency: string): number {
  const priceKey = currency === 'EUR' ? 'price_base_eur' : 'price_base_usd';
  return Number(product?.[priceKey] ?? product?.price ?? 0);
}

export function getComboPartPrice(
  combo: any,
  part: ComboPartKey,
  currency: string,
  overrides: ComboPriceOverrides = {},
): number {
  const override = overrides[part];
  if (override !== undefined) return Number(override);

  return getStoredComboPartPrice(combo, part, currency);
}

export function getComboTotalPrice(
  combo: any,
  currency: string,
  overrides: ComboPriceOverrides = {},
): number {
  return (['cpu', 'gpu', 'ram'] as ComboPartKey[]).reduce(
    (total, part) => total + getComboPartPrice(combo, part, currency, overrides),
    0,
  );
}

export function applyComboPriceOverrides(
  combo: any,
  currency: string,
  overrides: ComboPriceOverrides = {},
): any {
  const effectiveCombo = { ...combo };

  (Object.keys(overrides) as ComboPartKey[]).forEach((part) => {
    const value = overrides[part];
    if (value === undefined || !Number.isFinite(Number(value))) return;

    const currentCurrency = currency === 'EUR' ? 'EUR' : 'USD';
    const otherCurrency = currentCurrency === 'EUR' ? 'USD' : 'EUR';
    const currentCurrencyKey = `custom_price_${part}_${currentCurrency.toLowerCase()}`;
    const otherCurrencyKey = `custom_price_${part}_${otherCurrency.toLowerCase()}`;
    const activeValue = Number(value);

    effectiveCombo[currentCurrencyKey] = activeValue;
    effectiveCombo[otherCurrencyKey] = convertPrice(activeValue, currentCurrency, otherCurrency);
  });

  return effectiveCombo;
}

export function normalizeCombo(combo: any, currency: string): any {
  return {
    ...combo,
    type: 'COMBO',
    comparisonType: 'combo',
    name: combo?.title || 'Combo sin título',
    brand: 'Combo',
    price: getComboTotalPrice(combo, currency),
    currency,
  };
}
