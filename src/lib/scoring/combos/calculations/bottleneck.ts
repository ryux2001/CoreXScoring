import { SCORING_WEIGHTS } from '../config';

/**
 * Approximate balance from gaming notes. RAM only creates friction when it is
 * below the main CPU/GPU level; surplus RAM performance is never a bottleneck.
 */
export const calculateComboBottleneck = (
  cpuGaming: number,
  gpuGaming: number,
  ramGaming: number
): number => {
  const { DELTA_CPU_GPU, DELTA_RAM, FRICTION_MULTIPLIER } = SCORING_WEIGHTS.BOTTLENECK;

  const deltaCpuGpu = Math.abs(cpuGaming - gpuGaming);
  const maxCoreScore = Math.max(cpuGaming, gpuGaming);
  const deltaRam = Math.max(0, maxCoreScore - ramGaming);

  const friction = deltaCpuGpu * DELTA_CPU_GPU + deltaRam * DELTA_RAM;
  const score = 10 - friction * FRICTION_MULTIPLIER;

  return Math.min(10, Math.max(0, score));
};
