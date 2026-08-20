import { convertPrice, normalizeCurrency } from '@/lib/currency';
import { Build } from '../types';
import { numberValue } from '../utils';

/**
 * Resolve one build-part price.
 *
 * The priority order is deliberately unchanged:
 * draft custom price, active-currency custom price, other-currency custom
 * price, active-currency base price, and finally USD base price.
 */
export const getBuildPartPrice = (
  build: Build,
  part: string,
  currency: string,
  draftCurrency?: string,
): number => {
  const item = build?.[part];
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedSuffix = normalizedCurrency.toLowerCase();

  const draftPrice = numberValue(build?.customPrices?.[part], -1);
  if (build?.priceModes?.[part] === 'custom' && draftPrice >= 0) {
    return convertPrice(
      draftPrice,
      draftCurrency || normalizedCurrency,
      normalizedCurrency,
    );
  }

  const customKeys = [
    `custom_price_${part}_${normalizedSuffix}`,
    `price_${part}_${normalizedSuffix}`,
  ];

  for (const key of customKeys) {
    const customPrice = numberValue(build?.[key], -1);
    if (customPrice >= 0) return customPrice;
  }

  const otherCurrency = normalizedCurrency === 'EUR' ? 'USD' : 'EUR';
  const otherSuffix = otherCurrency.toLowerCase();
  const otherCustomKeys = [
    `custom_price_${part}_${otherSuffix}`,
    `price_${part}_${otherSuffix}`,
  ];

  for (const key of otherCustomKeys) {
    const customPrice = numberValue(build?.[key], -1);
    if (customPrice >= 0) {
      return convertPrice(customPrice, otherCurrency, normalizedCurrency);
    }
  }

  const basePrice = numberValue(item?.[`price_base_${normalizedSuffix}`], -1);
  if (basePrice >= 0) return basePrice;

  const genericBasePrice = numberValue(item?.price_base, -1);
  if (genericBasePrice >= 0) return genericBasePrice;

  const otherBasePrice = numberValue(item?.[`price_base_${otherSuffix}`], -1);
  return otherBasePrice < 0
    ? 0
    : convertPrice(otherBasePrice, otherCurrency, normalizedCurrency);
};
