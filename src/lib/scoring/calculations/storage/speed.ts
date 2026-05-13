/**
 * STORAGE SPEED SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateSpeedScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  const readSpeed = safeExtract(benchmarks?.crystal_disk_read, 0);
  const writeSpeed = safeExtract(specs?.read_speed, 0);
  
  return formatNoteScore(7.5);
};

