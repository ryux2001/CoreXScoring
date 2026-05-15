/**
 * CPU TECHNOLOGIES EXTRACTOR
 * Extrae datos de tecnologías para cálculo de nota
 */

import { safeExtract } from './validators';
import { kbToMb } from './helpers';

// Año actual por defecto (puede ser sobrescrito)
export const DEFAULT_YEAR = 2026;

// Configuración de puntuación
const TECHNOLOGY_MAX_POINTS = 10000;

// Palabras clave por categoría - 3000 pts (500 pts cada una)
const KEYWORDS = {
  ia: ['ai', 'npu', 'deep learning', 'ryzen ai', 'xdna', 'neural', 'avx-512'],
  multithread: ['hyper-threading', 'smt', 'simultaneous multithreading', 'multihilo', 'multithread'],
  overclock: ['unlocked', 'desbloqueado', 'overclock', 'overclocking', 'pbo', 'precision boost overdrive', 'thermal velocity boost', 'expo', 'xmp'],
  architecture: ['3d v-cache', '3d cache', 'thread director', 'chiplet'],
  virtualization: ['virtualization', 'virtualizacion', 'vt-x', 'vt-d', 'amd-v', 'svm'],
  security: ['vpro', 'trustzone', 'amd pro', 'sgx', 'ftpm', 'tpm'],
};

/**
 * Extraer RAM Score (2000 pts)
 * Prioridad: DDR5 > DDR4 > DDR3 > Resto
 */
export const getRamScore = (product: any): number => {
  const ramType = (product?.compatibility?.ram_type || '').toLowerCase();
  
  // Verificar si tiene DDR5 (prioridad máxima)
  if (ramType.includes('ddr5')) {
    return 2000;
  }
  
  // Verificar si tiene DDR4
  if (ramType.includes('ddr4')) {
    return 1000;
  }
  
  // Verificar si tiene DDR3
  if (ramType.includes('ddr3')) {
    return 250;
  }
  
  // Resto
  return 0;
};

/**
 * Extraer PCIe Score (2000 pts)
 */
export const getPcieScore = (product: any): number => {
  const pcie = safeExtract(product?.compatibility?.pcie, 0);
  const pcieVersion = pcie.toString();
  
  // Verificar si tiene PCIe 5.0 (prioridad máxima)
  if (pcieVersion === '5.0' || pcieVersion === '5') {
    return 2000;
  }
  
  // Verificar si tiene PCIe 4.0
  if (pcieVersion === '4.0' || pcieVersion === '4') {
    return 1400;
  }
  
  // Verificar si tiene PCIe 3.0
  if (pcieVersion === '3.0' || pcieVersion === '3') {
    return 700;
  }
  
  // Resto
  return 0;
};

/**
 * Extraer Edad Score (1500 pts)
 * Penalización: -150 pts por cada año de diferencia
 */
export const getAgeScore = (product: any, year: number = DEFAULT_YEAR): number => {
  const releaseYear = parseInt(product?.release_year || 0, 10);
  if (!releaseYear || releaseYear <= 0) return 0;
  
  const age = year - releaseYear;
  const baseScore = 1500;
  const penalty = age * 150;
  
  return Math.max(0, baseScore - penalty);
};

/**
 * Extraer Arquitectura Híbrida Score (1500 pts)
 * Si efficiency_cores > 0: gana 1500 pts
 */
export const getHybridArchScore = (product: any): number => {
  const efficiencyCores = parseInt(product?.specs?.efficency_cores || 0, 10);
  return efficiencyCores > 0 ? 1500 : 0;
};

/**
 * Extraer Keywords Score (3000 pts)
 * 500 pts por categoría que tenga al menos una palabra clave
 */
export const getKeywordsScore = (product: any, year: number = DEFAULT_YEAR): number => {
  const technologies = product?.technologies || [];
  
  if (!Array.isArray(technologies) || technologies.length === 0) {
    return 0;
  }
  
  // Extraer nombres de tecnologías (solo nombres, no descripciones)
  const techNames = technologies
    .map((t: any) => t?.name || '')
    .filter((name: string) => name && name.trim() !== '');
  
  // Unir todos los nombres en un solo string para búsqueda
  const allText = techNames.join(' ').toLowerCase();
  
  let score = 0;
  
  // Verificar cada categoría
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    let categoryFound = false;
    
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        categoryFound = true;
        break;
      }
    }
    
    if (categoryFound) {
      score += 500;
    }
  }
  
  return score;
};

/**
 * Calcular nota de tecnologías
 * Total: 10000 pts
 * - RAM: 2000 pts
 * - PCIe: 2000 pts
 * - Edad: 1500 pts
 * - Arquitectura híbrida: 1500 pts
 * - Keywords: 3000 pts (500 pts por categoría)
 */
export const calculateTechnologiesScore = (product: any, year: number = DEFAULT_YEAR): number => {
  let totalScore = 0;
  
  // RAM (2000 pts)
  totalScore += getRamScore(product);
  
  // PCIe (2000 pts)
  totalScore += getPcieScore(product);
  
  // Edad (1500 pts)
  totalScore += getAgeScore(product, year);
  
  // Arquitectura híbrida (1500 pts)
  totalScore += getHybridArchScore(product);
  
  // Keywords (3000 pts)
  totalScore += getKeywordsScore(product, year);
  
  // Normalizar a escala 0-10
  const normalizedScore = Math.min(10, (totalScore / TECHNOLOGY_MAX_POINTS) * 10);
  
  return normalizedScore;
};
