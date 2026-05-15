/**
 * CPU PRODUCTIVITY SCORE CALCULATOR
 * Calcula la nota de productividad para CPU
 * Similar estructura a potency.ts
 */

import { CPU_CONFIG } from '../../config/cpu';
import { formatNoteScore, safeExtract } from '../../utils/helpers';

export const calculateProductivityScore = (product: any): number => {
  // Parsear JSONB strings que vienen de Supabase
  const benchmarks = typeof product?.benchmarks === 'string'
    ? JSON.parse(product.benchmarks)
    : product?.benchmarks || {};
  
  const specs = typeof product?.specs === 'string'
    ? JSON.parse(product.specs)
    : product?.specs || {};
  
  const technologies = typeof product?.technologies === 'string'
    ? JSON.parse(product.technologies)
    : product?.technologies || [];
  
  // Extraer datos con safeExtract (como potency.ts)
  const cinebench = safeExtract(benchmarks?.cinebench_multi, 0);
  const passmark = safeExtract(benchmarks?.passmark_score, 0);
  const threads = parseInt(specs?.threads || '0', 10);
  const ecores = parseInt(specs?.efficency_cores || '0', 10);
  // ram_max_support está en compatibility, no en specs
  const ramMax = safeExtract(product?.compatibility?.ram_max_support || specs?.ram_max_support, 0);
  
  // 1. Fuerza bruta multitarea (4500 pts)
  const { WEIGHTS: bruteWeights, MAX_VALUES: bruteMax } = CPU_CONFIG.PRODUCTIVITY.BRUTE_FORCE;
  const cinebenchPoints = (cinebench / bruteMax.cinebench) * bruteWeights.cinebench;
  const passmarkPoints = (passmark / bruteMax.passmark) * bruteWeights.passmark;
  const bruteForceTotal = cinebenchPoints + passmarkPoints;
  
  // 2. Capacidad física (3000 pts)
  const { WEIGHTS: physicalWeights, MAX_VALUES: physicalMax } = CPU_CONFIG.PRODUCTIVITY.PHYSICAL_CAPACITY;
  const threadsPoints = (Math.min(threads, physicalMax.threads) / physicalMax.threads) * physicalWeights.threads;
  const ecoresPoints = (Math.min(ecores, physicalMax.ecores) / physicalMax.ecores) * physicalWeights.ecores;
  const physicalCapacityTotal = threadsPoints + ecoresPoints;
  
  // 3. Ecosistema profesional (2500 pts)
  const { WEIGHTS: ecoWeights, MAX_VALUES: ecoMax } = CPU_CONFIG.PRODUCTIVITY.PROFESSIONAL_ECOSYSTEM;
  const ramPoints = (Math.min(ramMax, ecoMax.ram) / ecoMax.ram) * ecoWeights.ram;
  
  // Puntos fijos para tecnologías
  const virtualizationPoints = CPU_CONFIG.PRODUCTIVITY.VIRTUALIZATION_POINTS;
  const aiPoints = CPU_CONFIG.PRODUCTIVITY.AI_POINTS;
  
  // Detectar tecnologías
  const hasVirtualization = detectTechnology(technologies, CPU_CONFIG.PRODUCTIVITY.TECHNOLOGY_KEYWORDS.virtualization);
  const hasAI = detectTechnology(technologies, CPU_CONFIG.PRODUCTIVITY.TECHNOLOGY_KEYWORDS.ai);
  
  const professionalEcosystemTotal = ramPoints + (hasVirtualization ? virtualizationPoints : 0) + (hasAI ? aiPoints : 0);
  
  // Total puntos
  const totalPoints = bruteForceTotal + physicalCapacityTotal + professionalEcosystemTotal;
  
  // Escalar a 0-10 (como potency.ts)
  const normalizedScore = (totalPoints / CPU_CONFIG.PRODUCTIVITY.TOTAL_POINTS) * 10;
  return formatNoteScore(normalizedScore);
};

/**
 * Helper para detectar tecnologías (similar a getRamScore en technology-extractor.ts)
 */
function detectTechnology(technologies: any[], keywords: string[]): boolean {
  if (!Array.isArray(technologies)) return false;
  
  for (const tech of technologies) {
    const name = (tech?.name || '').toLowerCase();
    if (keywords.some(keyword => name.includes(keyword))) {
      return true;
    }
  }
  
  return false;
}
