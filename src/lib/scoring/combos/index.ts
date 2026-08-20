import { getComponentFairPrice, getComponentNotes } from '@/lib/scoring/index';
import { getGpuGamingScore } from '@/lib/scoring/components/calculations/gpu/gpu';
import { ComboScores, ComboPrices } from './types';
import { calculateComboPotency } from './calculations/potency';
import { calculateComboProductivity } from './calculations/productivity';
import { calculateComboGaming } from './calculations/gaming';
import { calculateComboEfficiency } from './calculations/efficiency';
import { calculateComboBottleneck } from './calculations/bottleneck';
import { calculateComboValue } from './calculations/value';
import { normalizeCurrency } from '@/lib/currency';
import { getComboPartPrice } from './calculations/prices';

const getEmptyComboScores = (): ComboScores => ({
  Potencia: 0,
  Productividad: 0,
  Gaming: 0,
  Eficiencia: 0,
  "Cuello Botella": 0,
  "Calidad Precio": 0,
});

const hasCompleteCombo = (combo: Record<string, unknown>): boolean => (
  Boolean(combo?.cpu) &&
  Boolean(combo?.gpu) &&
  Boolean(combo?.ram)
);

/**
 * Combo scoring orchestrator: resolve prices, calculate component notes, then
 * apply the six combo-level formulas. Final rounding remains at one decimal.
 */
export const getComboNotes = (
  combo: Record<string, unknown>,
  currency: string = 'USD'
): ComboScores => {
  if (!hasCompleteCombo(combo)) return getEmptyComboScores();

  const activeCurrency = normalizeCurrency(currency);

  const cpu = combo.cpu as Record<string, unknown>;
  const gpu = combo.gpu as Record<string, unknown>;
  const ram = combo.ram as Record<string, unknown>;

  const draftCurrency = combo?.priceModes ? activeCurrency : undefined;

  // 1. Precios efectivos en USD (para evaluar la nota individual de calidad/precio de cada pieza)
  const cpuPriceUSD = getComboPartPrice(combo, 'cpu', 'USD', draftCurrency);
  const gpuPriceUSD = getComboPartPrice(combo, 'gpu', 'USD', draftCurrency);
  const ramPriceUSD = getComboPartPrice(combo, 'ram', 'USD', draftCurrency);

  // 2. La calidad-precio se agrega en USD, la misma base de los precios justos.
  const prices: ComboPrices = {
    cpuPrice: cpuPriceUSD,
    gpuPrice: gpuPriceUSD,
    ramPrice: ramPriceUSD,
    totalPrice: cpuPriceUSD + gpuPriceUSD + ramPriceUSD,
  };

  // 3. Obtener notas individuales pasando los precios efectivos (Custom ?? Base)
  const cpuNotes = getComponentNotes(cpu, cpuPriceUSD);
  const gpuNotes = getComponentNotes(gpu, gpuPriceUSD);
  const ramNotes = getComponentNotes(ram, ramPriceUSD);
  const gpuGaming = getGpuGamingScore(gpuNotes);

  // 4. Cálculos finales del combo
  const potency = calculateComboPotency(
    cpuNotes['Potencia'] || 0,
    gpuNotes['Rasterización'] || 0,
    ramNotes['Velocidad'] || 0,
    ramNotes['Latencia'] || 0
  );

  const productivity = calculateComboProductivity(
    cpuNotes['Productividad'] || 0,
    gpuNotes['Productividad'] || 0,
    ramNotes['Productividad'] || 0
  );

  const gaming = calculateComboGaming(
    cpuNotes['Gaming'] || cpuNotes['Juegos'] || 0,
    gpuGaming,
    ramNotes['Gaming'] || ramNotes['Juegos'] || 0
  );

  const efficiency = calculateComboEfficiency(
    cpuNotes['Eficiencia'] || 0,
    gpuNotes['Eficiencia'] || 0
  );

  const bottleneck = calculateComboBottleneck(
    cpuNotes['Gaming'] || cpuNotes['Juegos'] || 0,
    gpuGaming,
    ramNotes['Gaming'] || ramNotes['Juegos'] || 0
  );

  const value = calculateComboValue(
    getComponentFairPrice(cpu, cpuNotes),
    getComponentFairPrice(gpu, gpuNotes),
    getComponentFairPrice(ram, ramNotes),
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

export { getComboPartPrice } from './calculations/prices';
