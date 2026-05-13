/**
 * MOTHERBOARD ELECTRICAL STABILITY SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateElectricalStabilityScore = (product: any): number => {
  const specs = product?.specs || {};
  const powerPhases = parseInt(specs?.power_phases?.replace(/[+-]/g, '').split('+').pop() || '0', 10);
  
  return formatNoteScore(7.5);
};

