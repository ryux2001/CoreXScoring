/**
 * GPU GAMING SCORE CALCULATOR
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

export const calculateGamingScore = (product: any): number => {
  // CORRECCIÓN: Parsear de forma segura los objetos JSONB de Supabase
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  // Extraer benchmarks
  const timeSpy = safeExtract(benchmarks?.['3dmark_time_spy'], 0);
  const portRoyal = safeExtract(benchmarks?.['3dmark_port_royal'], 0);
  const vramCapacity = safeExtract(specs?.vram_capacity, 0);
  
  // Extraer tecnologías para búsqueda de keywords
  const allText = (technologies || []).map((t: any) => (t.name || '') + ' ' + (t.description || '')).join(' ').toLowerCase();
  const searchText = allText.toLowerCase();
  
  // 1. Motor Rasterización (4500 pts)
  const rasterizationPoints = Math.min(timeSpy, GPU_CONFIG.JUEGOS.RASTERIZATION.MAX_VALUES.timeSpy) * (GPU_CONFIG.JUEGOS.RASTERIZATION.WEIGHTS.timeSpy / GPU_CONFIG.JUEGOS.RASTERIZATION.MAX_VALUES.timeSpy);
  
  // 2. Motor Ray Tracing (2500 pts)
  const rayTracingPoints = Math.min(portRoyal, GPU_CONFIG.JUEGOS.RAY_TRACING.MAX_VALUES.portRoyal) * (GPU_CONFIG.JUEGOS.RAY_TRACING.WEIGHTS.portRoyal / GPU_CONFIG.JUEGOS.RAY_TRACING.MAX_VALUES.portRoyal);
  
  // 3. Texturas VRAM (1500 pts)
  let texturesPoints = 0;
  if (vramCapacity >= GPU_CONFIG.JUEGOS.TEXTURES.MAX_VALUES.capacity) {
    texturesPoints = GPU_CONFIG.JUEGOS.TEXTURES.WEIGHTS.capacity;
  } else {
    texturesPoints = (vramCapacity / GPU_CONFIG.JUEGOS.TEXTURES.MAX_VALUES.capacity) * GPU_CONFIG.JUEGOS.TEXTURES.WEIGHTS.capacity;
  }
  
  // 4. Tecnología FPS (1500 pts)
  let fpsTechPoints = 0;
  
  // Nivel máximo (1500 pts)
  if (GPU_CONFIG.JUEGOS.FPS_TECH.TIER_1_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    fpsTechPoints = GPU_CONFIG.JUEGOS.FPS_TECH.POINTS;
  }
  // Nivel medio (1200 pts)
  else if (GPU_CONFIG.JUEGOS.FPS_TECH.TIER_2_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    fpsTechPoints = 1200;
  }
  // Nivel básico (800 pts)
  else if (GPU_CONFIG.JUEGOS.FPS_TECH.TIER_3_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    fpsTechPoints = 800;
  }
  
  // Total puntos
  const totalPoints = rasterizationPoints + rayTracingPoints + texturesPoints + fpsTechPoints;
  
  return Math.min(10, (totalPoints / GPU_CONFIG.JUEGOS.TOTAL_POINTS) * 10);
};