/**
 * Δ(CPU-GPU) = |Nota CPU - Nota GPU|
 * Δ(RAM) = |max(Nota CPU, Nota GPU) - Nota RAM|
 * Fricción = (Δ(CPU-GPU) x 0.75) + (Δ(RAM) x 0.25)
 * Nota Final = 10 - (Fricción x 1.2)
 */
export const calculateComboBottleneck = (
  cpuGaming: number,
  gpuGaming: number,
  ramGaming: number
): number => {
  const deltaCpuGpu = Math.abs(cpuGaming - gpuGaming);
  const maxCoreScore = Math.max(cpuGaming, gpuGaming);
  const deltaRam = Math.abs(maxCoreScore - ramGaming);

  const friction = deltaCpuGpu * 0.75 + deltaRam * 0.25;
  const score = 10 - friction * 1.2;

  return Math.min(10, Math.max(0, score));
};