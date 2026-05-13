/**
 * PSU PROTECTIONS SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateProtectionsScore = (product: any): number => {
  const specs = product?.specs || {};
  const protections = specs?.protections || [];
  
  return formatNoteScore(7.5);
};

