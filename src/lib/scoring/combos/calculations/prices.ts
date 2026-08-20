import { convertPrice, normalizeCurrency } from '@/lib/currency';
import { ComboPartKey } from '../types';

const getNumericPrice = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const getRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
);

/** Resolve draft, custom and base prices in the same order as the old orchestrator. */
export const getComboPartPrice = (
  combo: Record<string, unknown>,
  part: ComboPartKey,
  currency: string,
  draftCurrency?: string,
): number => {
  const targetCurrency = normalizeCurrency(currency);
  const targetSuffix = targetCurrency.toLowerCase();
  const customPrices = getRecord(combo.customPrices);
  const priceModes = getRecord(combo.priceModes);
  const product = getRecord(combo[part]);

  const draftPrice = customPrices[part];
  const isDraftCustom = priceModes[part] === 'custom';
  const draftNumericPrice = getNumericPrice(draftPrice);
  if (isDraftCustom && draftNumericPrice !== null) {
    return convertPrice(
      draftNumericPrice,
      draftCurrency || targetCurrency,
      targetCurrency,
    );
  }

  const customPrice = getNumericPrice(combo[`custom_price_${part}_${targetSuffix}`]);
  if (customPrice !== null) return customPrice;

  const otherCurrency = targetCurrency === 'EUR' ? 'USD' : 'EUR';
  const otherSuffix = otherCurrency.toLowerCase();
  const otherCustomPrice = getNumericPrice(combo[`custom_price_${part}_${otherSuffix}`]);
  if (otherCustomPrice !== null) {
    return convertPrice(otherCustomPrice, otherCurrency, targetCurrency);
  }

  const targetBasePrice = getNumericPrice(product[`price_base_${targetSuffix}`]);
  if (targetBasePrice !== null) return targetBasePrice;

  const genericBasePrice = getNumericPrice(product.price_base);
  if (genericBasePrice !== null) return genericBasePrice;

  const otherBasePrice = getNumericPrice(product[`price_base_${otherSuffix}`]);
  return otherBasePrice === null
    ? 0
    : convertPrice(otherBasePrice, otherCurrency, targetCurrency);
};
