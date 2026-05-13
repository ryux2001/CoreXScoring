/**
 * PSU STABILITY SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateStabilityScore = (product: any): number => {
  const specs = product?.specs || {};
  const wattage = safeExtract(specs?.wattage, 0);
  
  return formatNoteScore(7.5);
};

