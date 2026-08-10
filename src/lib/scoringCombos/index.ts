import { getComponentNotes } from '@/lib/scoring/index';
import { ComboScores, ComboPrices } from './types';
import { calculateComboPotency } from './calculations/potency';
import { calculateComboProductivity } from './calculations/productivity';
import { calculateComboGaming } from './calculations/gaming';
import { calculateComboEfficiency } from './calculations/efficiency';
import { calculateComboBottleneck } from './calculations/bottleneck';
import { calculateComboValue } from './calculations/value';
import { convertPrice, normalizeCurrency } from '@/lib/currency';

type ComboPartKey = 'cpu' | 'gpu' | 'ram';

const getNumericPrice = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

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

export const getComboNotes = (
  combo: any,
  currency: string = 'USD'
): ComboScores => {
  if (!combo) {
    return {
      Potencia: 0,
      Productividad: 0,
      Gaming: 0,
      Eficiencia: 0,
      "Cuello Botella": 0,
      "Calidad Precio": 0,
    };
  }

  const activeCurrency = normalizeCurrency(currency);

  const cpu = combo.cpu || {};
  const gpu = combo.gpu || {};
  const ram = combo.ram || {};

  const draftCurrency = combo?.priceModes ? activeCurrency : undefined;

  // 1. Precios efectivos en USD (para evaluar la nota individual de calidad/precio de cada pieza)
  const cpuPriceUSD = getComboPartPrice(combo, 'cpu', 'USD', draftCurrency);
  const gpuPriceUSD = getComboPartPrice(combo, 'gpu', 'USD', draftCurrency);
  const ramPriceUSD = getComboPartPrice(combo, 'ram', 'USD', draftCurrency);

  // 2. Precios efectivos según la divisa activa (para ponderar el combo)
  const cpuPrice = getComboPartPrice(combo, 'cpu', activeCurrency, draftCurrency);
  const gpuPrice = getComboPartPrice(combo, 'gpu', activeCurrency, draftCurrency);
  const ramPrice = getComboPartPrice(combo, 'ram', activeCurrency, draftCurrency);

  const totalPrice = cpuPrice + gpuPrice + ramPrice;

  const prices: ComboPrices = {
    cpuPrice,
    gpuPrice,
    ramPrice,
    totalPrice,
  };

  // 3. Obtener notas individuales pasando los precios efectivos (Custom ?? Base)
  const cpuNotes = getComponentNotes(cpu, cpuPriceUSD);
  const gpuNotes = getComponentNotes(gpu, gpuPriceUSD);
  const ramNotes = getComponentNotes(ram, ramPriceUSD);

  // 4. Cálculos finales del combo
  const potency = calculateComboPotency(
    cpuNotes['Potencia'] || 0,
    gpuNotes['Potencia'] || 0,
    ramNotes['Velocidad'] || 0,
    ramNotes['Latencia'] || 0
  );

  const productivity = calculateComboProductivity(
    cpuNotes['Productividad'] || 0,
    gpuNotes['Productividad'] || 0,
    ramNotes['Productividad'] || 0
  );

  const gaming = calculateComboGaming(
    cpuNotes['Juegos'] || 0,
    gpuNotes['Juegos'] || 0,
    ramNotes['Juegos'] || 0
  );

  const efficiency = calculateComboEfficiency(
    cpuNotes['Eficiencia'] || 0,
    gpuNotes['Eficiencia'] || 0
  );

  const bottleneck = calculateComboBottleneck(
    cpuNotes['Juegos'] || 0,
    gpuNotes['Juegos'] || 0,
    ramNotes['Juegos'] || 0
  );

  const value = calculateComboValue(
    cpuNotes['Calidad precio'] || 0,
    gpuNotes['Calidad precio'] || 0,
    ramNotes['Calidad precio'] || 0,
    prices
  );

  return {
    Potencia: Number(potency.toFixed(1)),
    Productividad: Number(productivity.toFixed(1)),
    Gaming: Number(gaming.toFixed(1)),
    Eficiencia: Number(efficiency.toFixed(1)),
    "Cuello Botella": Number(bottleneck.toFixed(1)),
    "Calidad Precio": Number(value.toFixed(1)),
  };
};
