/**
 * STORAGE TECHNOLOGIES SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateTechnologiesScore = (product: any): number => {
  const specs = product?.specs || {};
  const nandType = specs?.nand_type || '';
  
  return formatNoteScore(7.5);
};

