/**
 * PSU BUILD QUALITY SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';

export const calculateBuildQualityScore = (product: any): number => {
  return formatNoteScore(7.5);
};

