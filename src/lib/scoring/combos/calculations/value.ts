import { ComboPrices } from '../types';
import { scoreFromFairPrice } from '../../components/calculations/value-curve';

/**
 * Calidad/Precio = curve(Σ PrecioJusto / Σ PrecioEvaluado)
 *
 * Summing fair prices before applying the nonlinear curve ensures that making
 * any component cheaper can never reduce the value note of the whole combo.
 */
export const calculateComboValue = (
  cpuFairPrice: number,
  gpuFairPrice: number,
  ramFairPrice: number,
  prices: ComboPrices
): number => {
  if (!prices.totalPrice || prices.totalPrice <= 0) return 0;

  const totalFairPrice = cpuFairPrice + gpuFairPrice + ramFairPrice;
  return Math.min(10, Math.max(0, scoreFromFairPrice(
    prices.totalPrice,
    totalFairPrice,
  )));
};
