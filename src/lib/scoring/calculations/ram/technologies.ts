/**
 * RAM TECHNOLOGIES SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeArrayLength } from '../../utils/validators';

export const calculateTechnologiesScore = (product: any): number => {
  const technologies = product?.technologies || [];
  return formatNoteScore(7.5);
};

