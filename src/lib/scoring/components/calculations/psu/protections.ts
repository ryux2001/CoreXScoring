/** PSU protection coverage score. */

import { PSU_CONFIG } from '../../config/psu';
import { getSpecs, parseArray, score10 } from './normalization';

function hasProtectionField(value: any): boolean {
  if (Array.isArray(value)) return true;
  if (typeof value !== 'string') return false;

  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}

export const calculateProtectionsScore = (product: any): number => {
  const rawProtections = getSpecs(product).protections;
  if (!hasProtectionField(rawProtections)) {
    return PSU_CONFIG.PROTECCIONES.MISSING_SCORE;
  }

  const protections = new Set(
    parseArray(rawProtections).map((protection) => String(protection).trim().toUpperCase()),
  );
  const coreWeights = PSU_CONFIG.PROTECCIONES.CORE_WEIGHTS;
  const corePoints = Object.entries(coreWeights).reduce(
    (total, [protection, weight]) => total + (protections.has(protection) ? weight : 0),
    0,
  );
  const extras = Object.entries(PSU_CONFIG.PROTECCIONES.EXTRA_SCORES).reduce(
    (total, [protection, points]) => total + (protections.has(protection) ? points : 0),
    0,
  );

  return score10(PSU_CONFIG.PROTECCIONES.CORE_SCORE * (corePoints / 100) + extras);
};
