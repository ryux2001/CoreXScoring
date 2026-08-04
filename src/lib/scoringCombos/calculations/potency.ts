import { SCORING_WEIGHTS } from '../constants';

export const calculateComboPotency = (
  cpuPotency: number,
  gpuPotency: number,
  ramSpeed: number,
  ramLatency: number
): number => {
  const { CPU, GPU, RAM_SPEED, RAM_LATENCY } = SCORING_WEIGHTS.POTENCY;

  const score =
    cpuPotency * CPU +
    gpuPotency * GPU +
    ramSpeed * RAM_SPEED +
    ramLatency * RAM_LATENCY;

  return Math.min(10, Math.max(0, score));
};