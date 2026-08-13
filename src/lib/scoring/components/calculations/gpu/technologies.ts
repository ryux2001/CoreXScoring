/**
 * GPU TECHNOLOGIES SCORE CALCULATOR
 */

import { GPU_CONFIG } from '../../config/gpu';
import { safeExtract } from '../../../shared/validators';

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

export const calculateTechnologiesScore = (product: any): number => {
  const compatibility = parseJsonbString(product?.compatibility || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  const releaseYear = product?.release_year || 0;
  const description = product?.description || '';
  
  // Extraer PCIe
  const pcieGen = parseFloat(safeExtract(compatibility?.pcie_generation, 0).toString());
  
  // Extraer APIs
  const directx = safeExtract(compatibility?.directx, 0).toString();
  const opengl = safeExtract(compatibility?.opengl, 0).toString();
  
  // 1. Plataforma (3000 pts)
  let platformPoints = 0;
  
  // PCIe
  if (GPU_CONFIG.TECNOLOGIAS.PLATFORM.PCIE_SCORES.hasOwnProperty(pcieGen)) {
    platformPoints += GPU_CONFIG.TECNOLOGIAS.PLATFORM.PCIE_SCORES[pcieGen as keyof typeof GPU_CONFIG.TECNOLOGIAS.PLATFORM.PCIE_SCORES];
  }
  
  // APIs (1000 pts si tiene DX12 y OpenGL 4.6)
  if (directx === '12' && opengl === '4.6') {
    platformPoints += GPU_CONFIG.TECNOLOGIAS.PLATFORM.WEIGHTS.apis;
  }
  
  // 2. Penalización edad (2000 pts)
  let agePoints = GPU_CONFIG.TECNOLOGIAS.AGE_PENALTY.POINTS;
  if (releaseYear > 0) {
    const age = new Date().getFullYear() - releaseYear;
    const penalty = age * GPU_CONFIG.TECNOLOGIAS.AGE_PENALTY.PENALTY_PER_YEAR;
    agePoints = Math.max(0, agePoints - penalty);
  }
  
  // 3. VIP Software IA (5000 pts)
  let vipPoints = 0;
  
  // Unificar textos para búsqueda semántica insensible a mayúsculas
  const techArrayStr = Array.isArray(technologies) ? JSON.stringify(technologies) : '';
  const allText = (technologies || []).map((t: any) => (t.name || '') + ' ' + (t.description || '')).join(' ').toLowerCase();
  const descText = description.toLowerCase();
  const searchText = (techArrayStr + ' ' + allText + ' ' + descText).toLowerCase();
  
  const vipConfig = GPU_CONFIG.TECNOLOGIAS.VIP_SOFTWARE;

  // --- Categoría 1: Generación de Fotogramas y escalado ---
  if (vipConfig.CAT_1_PREMIUM_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    vipPoints += vipConfig.CAT_1_PREMIUM_POINTS; // Se lleva el máximo (1250)
  } else if (vipConfig.CAT_1_STANDARD_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    vipPoints += vipConfig.CAT_1_STANDARD_POINTS; // Se lleva el estándar (750)
  }
  
  // --- Categoría 2: IA Avanzada ---
  if (vipConfig.CAT_2_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    vipPoints += vipConfig.CAT_2_POINTS; // (1250)
  }
  
  // --- Categoría 3: Trazado de Rayos ---
  if (vipConfig.CAT_3_PREMIUM_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    vipPoints += vipConfig.CAT_3_PREMIUM_POINTS; // Se lleva el máximo por Path Tracing / RR (1250)
  } else if (vipConfig.CAT_3_STANDARD_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    vipPoints += vipConfig.CAT_3_STANDARD_POINTS; // Se lleva el estándar por RT básico (600)
  }
  
  // --- Categoría 4: Latencia y ecosistema ---
  if (vipConfig.CAT_4_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    vipPoints += vipConfig.CAT_4_POINTS; // (1250)
  }
  
  // Total puntos
  const totalPoints = platformPoints + agePoints + vipPoints;
  
  return Math.min(10, (totalPoints / GPU_CONFIG.TECNOLOGIAS.TOTAL_POINTS) * 10);
};