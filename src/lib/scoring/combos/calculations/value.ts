import { ComboPrices } from '../types';

/**
 * Calidad/Precio = Σ (Nota_Comp x (Precio_Comp / Precio_Total))
 */
/** Price-weighted average of the three component value notes. */
export const calculateComboValue = (
  cpuValueScore: number,
  gpuValueScore: number,
  ramValueScore: number,
  prices: ComboPrices
): number => {
  if (!prices.totalPrice || prices.totalPrice <= 0) return 0;

  const cpuWeight = prices.cpuPrice / prices.totalPrice;
  const gpuWeight = prices.gpuPrice / prices.totalPrice;
  const ramWeight = prices.ramPrice / prices.totalPrice;

  const score =
    cpuValueScore * cpuWeight +
    gpuValueScore * gpuWeight +
    ramValueScore * ramWeight;

  return Math.min(10, Math.max(0, score));
};
