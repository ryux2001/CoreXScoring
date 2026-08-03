import { getComponentNotes } from '@/lib/scoring/index';
import { ComboScores, ComboPrices } from './types';
import { calculateComboPotency } from './calculations/potency';
import { calculateComboProductivity } from './calculations/productivity';
import { calculateComboGaming } from './calculations/gaming';
import { calculateComboEfficiency } from './calculations/efficiency';
import { calculateComboBottleneck } from './calculations/bottleneck';
import { calculateComboValue } from './calculations/value';

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

  const isEUR = currency === 'EUR';

  const cpu = combo.cpu || {};
  const gpu = combo.gpu || {};
  const ram = combo.ram || {};

  // 1. Precios efectivos en USD (para evaluar la nota individual de calidad/precio de cada pieza)
  const cpuPriceUSD = Number(
    combo.custom_price_cpu_usd ?? cpu.price_base_usd ?? cpu.price_base ?? 0
  );
  const gpuPriceUSD = Number(
    combo.custom_price_gpu_usd ?? gpu.price_base_usd ?? gpu.price_base ?? 0
  );
  const ramPriceUSD = Number(
    combo.custom_price_ram_usd ?? ram.price_base_usd ?? ram.price_base ?? 0
  );

  // 2. Precios efectivos según la divisa activa (para ponderar el combo)
  const cpuPrice = isEUR
    ? Number(combo.custom_price_cpu_eur ?? cpu.price_base_eur ?? cpuPriceUSD)
    : cpuPriceUSD;

  const gpuPrice = isEUR
    ? Number(combo.custom_price_gpu_eur ?? gpu.price_base_eur ?? gpuPriceUSD)
    : gpuPriceUSD;

  const ramPrice = isEUR
    ? Number(combo.custom_price_ram_eur ?? ram.price_base_eur ?? ramPriceUSD)
    : ramPriceUSD;

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