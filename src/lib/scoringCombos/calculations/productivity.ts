/**
 * Productividad = (CPU productividad x 0.40) + (GPU productividad x 0.40) + (RAM productividad x 0.20)
 */
export const calculateComboProductivity = (
  cpuProd: number,
  gpuProd: number,
  ramProd: number
): number => {
  const score = cpuProd * 0.4 + gpuProd * 0.4 + ramProd * 0.2;
  return Math.min(10, Math.max(0, score));
};