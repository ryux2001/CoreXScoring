import { SCORING_WEIGHTS } from '../constants';

export const calculateComboEfficiency = (
  cpuEfficiency: number,
  gpuEfficiency: number
): number => {
  const { GPU, CPU } = SCORING_WEIGHTS.EFFICIENCY;

  const score = gpuEfficiency * GPU + cpuEfficiency * CPU;
  return Math.min(10, Math.max(0, score));
};