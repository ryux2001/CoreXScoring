/**
 * MOTHERBOARD BUILD QUALITY SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateBuildQualityScore = (product: any): number => {
  const specs = product?.specs || {};
  const vrmQuality = safeExtract(specs?.vrm_quality_rating, 0);
  
  return formatNoteScore(7.5);
};

