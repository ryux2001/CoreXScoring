/**
 * RAM SPEED SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateSpeedScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  const readSpeed = safeExtract(benchmarks?.read_speed, 0);
  const speed = safeExtract(specs?.speed, 0);
  
  return formatNoteScore(7.5);
};

