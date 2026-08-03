/**
 * Potencia = (CPU potencia x 0.40) + (GPU potencia x 0.45) + (RAM velocidad x 0.075) + (RAM latencia x 0.075)
 */
export const calculateComboPotency = (
  cpuPotency: number,
  gpuPotency: number,
  ramSpeed: number,
  ramLatency: number
): number => {
  const score =
    cpuPotency * 0.4 +
    gpuPotency * 0.45 +
    ramSpeed * 0.075 +
    ramLatency * 0.075;

  return Math.min(10, Math.max(0, score));
};