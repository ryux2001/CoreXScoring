/**
 * GPU PRODUCTIVITY SCORE CALCULATOR
 */

import { GPU_CONFIG } from '../../config/gpu';
import { safeExtract } from '../../utils/validators';

// Función para parsear JSONB strings de Supabase
function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export const calculateProductivityScore = (product: any): number => {
  // CORRECCIÓN: Parsear de forma segura los objetos JSONB de Supabase
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  // Extraer benchmarks
  const blenderScore = safeExtract(benchmarks?.blender_score, 0);
  
  // Extraer specs
  const vramCapacity = safeExtract(specs?.vram_capacity, 0);
  const tflops = safeExtract(specs?.tflops_fp32, 0);
  
  // Extraer tecnologías para búsqueda de keywords
  const allText = (technologies || []).map((t: any) => (t.name || '') + ' ' + (t.description || '')).join(' ').toLowerCase();
  const searchText = allText.toLowerCase();
  
  // 1. Renderizado 3D puro (4500 pts)
  const renderingPoints = Math.min(blenderScore, GPU_CONFIG.PRODUCTIVIDAD.RENDERING.MAX_VALUES.blender) * (GPU_CONFIG.PRODUCTIVIDAD.RENDERING.WEIGHTS.blender / GPU_CONFIG.PRODUCTIVIDAD.RENDERING.MAX_VALUES.blender);
  
  // 2. Capacidad VRAM (3500 pts)
  const vramPoints = Math.min(vramCapacity, GPU_CONFIG.PRODUCTIVIDAD.VRAM_CAPACITY.MAX_VALUES.capacity) * (GPU_CONFIG.PRODUCTIVIDAD.VRAM_CAPACITY.WEIGHTS.capacity / GPU_CONFIG.PRODUCTIVIDAD.VRAM_CAPACITY.MAX_VALUES.capacity);
  
  // 3. Fuerza Bruta (1000 pts)
  const bruteForcePoints = Math.min(tflops, GPU_CONFIG.PRODUCTIVIDAD.BRUTE_FORCE.MAX_VALUES.tflops) * (GPU_CONFIG.PRODUCTIVIDAD.BRUTE_FORCE.WEIGHTS.tflops / GPU_CONFIG.PRODUCTIVIDAD.BRUTE_FORCE.MAX_VALUES.tflops);
  
  // 4. Aceleración Profesional (1000 pts)
  let accelerationPoints = 0;
  if (GPU_CONFIG.PRODUCTIVIDAD.ACCELERATION.KEYWORDS.some(keyword => searchText.includes(keyword))) {
    accelerationPoints = GPU_CONFIG.PRODUCTIVIDAD.ACCELERATION.POINTS;
  }
  
  // Total puntos
  const totalPoints = renderingPoints + vramPoints + bruteForcePoints + accelerationPoints;
  
  return Math.min(10, (totalPoints / GPU_CONFIG.PRODUCTIVIDAD.TOTAL_POINTS) * 10);
};