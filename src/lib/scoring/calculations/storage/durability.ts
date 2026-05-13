/**
 * STORAGE DURABILITY SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateDurabilityScore = (product: any): number => {
  const specs = product?.specs || {};
  const tbw = safeExtract(specs?.tbw, 0);
  
  return formatNoteScore(7.5);
};

