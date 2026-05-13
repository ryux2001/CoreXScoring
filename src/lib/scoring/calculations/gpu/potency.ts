/**
 * GPU POTENCY SCORE CALCULATOR
 * Calcula la nota de potencia para GPU
 */

import { GPU_CONFIG } from '../../config/gpu';
import { safeExtract } from '../../utils/validators';

export const calculatePotencyScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  // Extraer benchmarks
  const fps1080 = safeExtract(benchmarks?.fps1080_gaming_avg_fps, 0);
  const fps1440 = safeExtract(benchmarks?.fps1440_gaming_avg_fps, 0);
  const fps4k = safeExtract(benchmarks?.fps4k_gaming_avg_fps, 0);
  const blender = safeExtract(benchmarks?.blender_score, 0);
  
  // Extraer specs
  const cudaCores = safeExtract(specs?.cuda_cores_stream_processors, 0);
  const vram = safeExtract(specs?.vram_capacity, 0);
  
  // Calcular (por defecto 7.5)
  return 7.5;
};

