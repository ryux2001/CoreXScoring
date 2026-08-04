import { SCORING_WEIGHTS } from '../constants';

export const calculateComboProductivity = (
  cpuProd: number,
  gpuProd: number,
  ramProd: number
): number => {
  const { CPU, GPU, RAM } = SCORING_WEIGHTS.PRODUCTIVITY;

  const score = cpuProd * CPU + gpuProd * GPU + ramProd * RAM;
  return Math.min(10, Math.max(0, score));
};