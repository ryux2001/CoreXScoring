/**
 * RAM TECHNOLOGIES SCORE
 *
 * Represents platform capability and compatibility, not marketing extras.
 * RGB, warranty and heat spreaders are intentionally excluded.
 */

import { normalizeRamProduct, score10 } from './normalization';
import { RAM_CONFIG } from '../../config/ram';

export const calculateTechnologiesScore = (product: any): number => {
  const features = normalizeRamProduct(product);
  const compatibilityScore = features.hasValidatedCompatibility
    ? 1
    : (features.hasXmp || features.hasExpo ? 0.72 : 0.45);

  // The shared platform score already contains generation, profiles,
  // electronics and overclocking. Compatibility is kept as a small separate
  // adjustment so the note does not double-count the same profile signal.
  const platformScore = features.platformScore * RAM_CONFIG.TECNOLOGIAS.PLATAFORMA_WEIGHT;
  const score = platformScore + compatibilityScore * RAM_CONFIG.TECNOLOGIAS.COMPATIBILIDAD_WEIGHT;

  return score10(score * 10);
};
