/**
 * STORAGE TEMPERATURES SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateTemperaturesScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const maxTemp = safeExtract(benchmarks?.max_temp_c, 0);
  
  return formatNoteScore(7.5);
};

