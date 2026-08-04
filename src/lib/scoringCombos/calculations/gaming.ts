import { SCORING_WEIGHTS } from '../constants';

export const calculateComboGaming = (
  cpuGaming: number,
  gpuGaming: number,
  ramGaming: number
): number => {
  const { CPU, GPU, RAM } = SCORING_WEIGHTS.GAMING;

  const score = cpuGaming * CPU + gpuGaming * GPU + ramGaming * RAM;
  return Math.min(10, Math.max(0, score));
};