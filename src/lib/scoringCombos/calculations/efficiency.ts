/**
 * Eficiencia = (GPU eficiencia x 0.60) + (CPU eficiencia x 0.40)
 */
export const calculateComboEfficiency = (
  cpuEfficiency: number,
  gpuEfficiency: number
): number => {
  const score = gpuEfficiency * 0.6 + cpuEfficiency * 0.4;
  return Math.min(10, Math.max(0, score));
};