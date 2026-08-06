export type ComparisonMode = 'components' | 'combos';
export type ComboPartKey = 'cpu' | 'gpu' | 'ram';

export type ComboPriceOverrides = Partial<Record<ComboPartKey, number>>;

export const EUR_TO_USD_RATE = 1.08;

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

  const currencySuffix = currency === 'EUR' ? 'eur' : 'usd';
  const customPrice = combo?.[`custom_price_${part}_${currencySuffix}`];
  const basePrice = combo?.[part]?.[`price_base_${currencySuffix}`];

  return Number(customPrice ?? basePrice ?? 0);
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

    const currentCurrencyKey = `custom_price_${part}_${currency === 'EUR' ? 'eur' : 'usd'}`;
    const otherCurrencyKey = `custom_price_${part}_${currency === 'EUR' ? 'usd' : 'eur'}`;
    const activeValue = Number(value);

    effectiveCombo[currentCurrencyKey] = activeValue;
    effectiveCombo[otherCurrencyKey] = currency === 'EUR'
      ? activeValue * EUR_TO_USD_RATE
      : activeValue / EUR_TO_USD_RATE;
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
