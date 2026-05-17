/**
 * RAM GAMES SCORE CALCULATOR
 */

import { RAM_CONFIG } from '../../config/ram';
import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateGamesScore = (product: any): number => {
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  
  // 1. Capacidad de texturas (3000 pts)
  const capacity = safeExtract(specs?.capacity, 0);
  const capPoints = Math.min(capacity, RAM_CONFIG.JUEGOS.CAPACIDAD.MAX_GB) / RAM_CONFIG.JUEGOS.CAPACIDAD.MAX_GB * RAM_CONFIG.JUEGOS.CAPACIDAD.POINTS;
  
  // 2. Frecuencias (4000 pts)
  const speed = safeExtract(specs?.speed, 0);
  const freqPoints = Math.min(speed, RAM_CONFIG.JUEGOS.FRECUENCIA.MAX_MHZ) / RAM_CONFIG.JUEGOS.FRECUENCIA.MAX_MHZ * RAM_CONFIG.JUEGOS.FRECUENCIA.POINTS;
  
  // 3. Estabilidad de FPS (3000 pts)
  const latencyNs = safeExtract(benchmarks?.latency_ns, 100);
  let estabPoints = 0;
  const maxRealNs = RAM_CONFIG.JUEGOS.ESTABILIDAD.MAX_NS;
  const minRealNs = RAM_CONFIG.JUEGOS.ESTABILIDAD.MIN_NS;
  
  if (latencyNs <= maxRealNs) {
    estabPoints = RAM_CONFIG.JUEGOS.ESTABILIDAD.POINTS;
  } else if (latencyNs < minRealNs) {
    estabPoints = ((minRealNs - latencyNs) / (minRealNs - maxRealNs)) * RAM_CONFIG.JUEGOS.ESTABILIDAD.POINTS;
  }
  
  const totalPoints = capPoints + freqPoints + estabPoints;
  return formatNoteScore(Math.min(10, (totalPoints / RAM_CONFIG.JUEGOS.TOTAL_POINTS) * 10));
};