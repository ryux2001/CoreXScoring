/**
 * Juegos = (CPU juegos x 0.30) + (GPU juegos x 0.55) + (RAM juegos x 0.15)
 */
export const calculateComboGaming = (
  cpuGaming: number,
  gpuGaming: number,
  ramGaming: number
): number => {
  const score = cpuGaming * 0.3 + gpuGaming * 0.55 + ramGaming * 0.15;
  return Math.min(10, Math.max(0, score));
};