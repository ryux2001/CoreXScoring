import { convertPrice } from '@/lib/currency';
import { getComboPartPrice as getStoredComboPartPrice } from '@/lib/scoringCombos';
import { getBuildPartPrice as getStoredBuildPartPrice } from '@/lib/scoringBuilds';

export type ComparisonMode = 'components' | 'combos' | 'builds';
export type ComboPartKey = 'cpu' | 'gpu' | 'ram';
export type BuildPartKey = ComboPartKey | 'motherboard' | 'storage' | 'psu';

export type ComboPriceOverrides = Partial<Record<ComboPartKey, number>>;
export type BuildPriceOverrides = Partial<Record<BuildPartKey, number>>;

export function isComboItem(item: any): boolean {
  return item?.comparisonType === 'combo' || String(item?.type || '').toUpperCase() === 'COMBO';
}

export function isBuildItem(item: any): boolean {
  return item?.comparisonType === 'build' || String(item?.type || '').toUpperCase() === 'BUILD';
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

export function getBuildPartPrice(
  build: any,
  part: BuildPartKey,
  currency: string,
  overrides: BuildPriceOverrides = {},
): number {
  const override = overrides[part];
  if (override !== undefined) return Number(override);

  return getStoredBuildPartPrice(build, part, currency);
}

export function getBuildTotalPrice(
  build: any,
  currency: string,
  overrides: BuildPriceOverrides = {},
): number {
  return (['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'] as BuildPartKey[]).reduce(
    (total, part) => total + getBuildPartPrice(build, part, currency, overrides),
    0,
  );
}

export function applyBuildPriceOverrides(
  build: any,
  currency: string,
  overrides: BuildPriceOverrides = {},
): any {
  const effectiveBuild = { ...build };

  (Object.keys(overrides) as BuildPartKey[]).forEach((part) => {
    const value = overrides[part];
    if (value === undefined || !Number.isFinite(Number(value))) return;

    const currentCurrency = currency === 'EUR' ? 'EUR' : 'USD';
    const otherCurrency = currentCurrency === 'EUR' ? 'USD' : 'EUR';
    const currentCurrencyKey = `custom_price_${part}_${currentCurrency.toLowerCase()}`;
    const otherCurrencyKey = `custom_price_${part}_${otherCurrency.toLowerCase()}`;
    const activeValue = Number(value);

    effectiveBuild[currentCurrencyKey] = activeValue;
    effectiveBuild[otherCurrencyKey] = convertPrice(activeValue, currentCurrency, otherCurrency);
  });

  return effectiveBuild;
}

export function normalizeBuild(build: any, currency: string): any {
  return {
    ...build,
    type: 'BUILD',
    comparisonType: 'build',
    name: build?.title || 'Build sin titulo',
    brand: 'Build',
    price: getBuildTotalPrice(build, currency),
    currency,
  };
}
