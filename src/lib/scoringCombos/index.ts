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
  const priceKey = isEUR ? 'price_base_eur' : 'price_base_usd';

  const cpu = combo.cpu || {};
  const gpu = combo.gpu || {};
  const ram = combo.ram || {};

  // Precios para ponderación porcentual
  const cpuPrice = cpu[priceKey] || cpu.price_base || 0;
  const gpuPrice = gpu[priceKey] || gpu.price_base || 0;
  const ramPrice = ram[priceKey] || ram.price_base || 0;

  const comboCustomPrice = combo[isEUR ? 'custom_price_eur' : 'custom_price_usd'] || combo.custom_price;
  const totalPrice = comboCustomPrice || (cpuPrice + gpuPrice + ramPrice);

  const prices: ComboPrices = {
    cpuPrice,
    gpuPrice,
    ramPrice,
    totalPrice,
  };

  // Extraer notas individuales del scoring existente
  const cpuPriceUSD = cpu.price_base_usd || cpu.price_base || 0;
  const gpuPriceUSD = gpu.price_base_usd || gpu.price_base || 0;
  const ramPriceUSD = ram.price_base_usd || ram.price_base || 0;

  const cpuNotes = getComponentNotes(cpu, cpuPriceUSD);
  const gpuNotes = getComponentNotes(gpu, gpuPriceUSD);
  const ramNotes = getComponentNotes(ram, ramPriceUSD);

  // Ejecución de cálculos ponderados del combo
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