/**
 * RAM LATENCY SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateLatencyScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  const latency = safeExtract(benchmarks?.latency_ns, 0);
  const latencySpec = parseInt(specs?.latency || '0', 10);
  
  return formatNoteScore(7.5);
};

