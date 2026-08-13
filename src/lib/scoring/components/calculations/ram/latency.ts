/**
 * RAM LATENCY SCORE CALCULATOR
 */

import { RAM_CONFIG } from '../../config/ram';
import { formatNoteScore } from '../../../shared/helpers';
import { safeExtract } from '../../../shared/validators';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateLatencyScore = (product: any): number => {
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  
  // 1. Latencia Real (6000 pts)
  const latencyNs = safeExtract(benchmarks?.latency_ns, 100);
  let realLatencyPoints = 0;
  const maxRealNs = RAM_CONFIG.LATENCIA.REAL.MAX_NS;
  const minRealNs = RAM_CONFIG.LATENCIA.REAL.MIN_NS;
  
  if (latencyNs <= maxRealNs) {
    realLatencyPoints = RAM_CONFIG.LATENCIA.REAL.POINTS;
  } else if (latencyNs < minRealNs) {
    realLatencyPoints = ((minRealNs - latencyNs) / (minRealNs - maxRealNs)) * RAM_CONFIG.LATENCIA.REAL.POINTS;
  }
  
  // 2. Latencia Teórica Pura (4000 pts)
  // Limpia el string de latencia por si viene como "CL16" y lo convierte a número
  const rawCl = (specs?.cas_latency || specs?.latency || '16').toString().replace(/\D/g, '');
  const cl = parseInt(rawCl, 10) || 16;
  const speed = safeExtract(specs?.speed, 1600); // 1600 de fallback para evitar divisiones por 0
  
  let theoLatencyPoints = 0;
  if (speed > 0) {
    const fwl = (cl / (speed / 2)) * 1000;
    const maxTheoNs = RAM_CONFIG.LATENCIA.TEORICA.MAX_NS;
    const minTheoNs = RAM_CONFIG.LATENCIA.TEORICA.MIN_NS;
    
    if (fwl <= maxTheoNs) {
      theoLatencyPoints = RAM_CONFIG.LATENCIA.TEORICA.POINTS;
    } else if (fwl < minTheoNs) {
      theoLatencyPoints = ((minTheoNs - fwl) / (minTheoNs - maxTheoNs)) * RAM_CONFIG.LATENCIA.TEORICA.POINTS;
    }
  }
  
  const totalPoints = realLatencyPoints + theoLatencyPoints;
  return formatNoteScore(Math.min(10, (totalPoints / RAM_CONFIG.LATENCIA.TOTAL_POINTS) * 10));
};