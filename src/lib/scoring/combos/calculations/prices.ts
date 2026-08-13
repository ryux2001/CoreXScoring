import { convertPrice, normalizeCurrency } from '@/lib/currency';
import { ComboPartKey } from '../types';

const getNumericPrice = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

/** Resolve draft, custom and base prices in the same order as the old orchestrator. */
export const getComboPartPrice = (
  combo: any,
  part: ComboPartKey,
  currency: string,
  draftCurrency?: string,
): number => {
  const targetCurrency = normalizeCurrency(currency);
  const targetSuffix = targetCurrency.toLowerCase();

  const draftPrice = combo?.customPrices?.[part];
  const isDraftCustom = combo?.priceModes?.[part] === 'custom';
  const draftNumericPrice = getNumericPrice(draftPrice);
  if (isDraftCustom && draftNumericPrice !== null) {
    return convertPrice(
      draftNumericPrice,
      draftCurrency || targetCurrency,
      targetCurrency,
    );
  }

  const customPrice = getNumericPrice(combo?.[`custom_price_${part}_${targetSuffix}`]);
  if (customPrice !== null) return customPrice;

  const otherCurrency = targetCurrency === 'EUR' ? 'USD' : 'EUR';
  const otherSuffix = otherCurrency.toLowerCase();
  const otherCustomPrice = getNumericPrice(combo?.[`custom_price_${part}_${otherSuffix}`]);
  if (otherCustomPrice !== null) {
    return convertPrice(otherCustomPrice, otherCurrency, targetCurrency);
  }

  return getNumericPrice(combo?.[part]?.[`price_base_${targetSuffix}`])
    ?? getNumericPrice(combo?.[part]?.price_base)
    ?? 0;
};
