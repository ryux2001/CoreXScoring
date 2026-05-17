/**
 * RAM TECHNOLOGIES SCORE CALCULATOR
 */

import { RAM_CONFIG } from '../../config/ram';
import { formatNoteScore } from '../../utils/helpers';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateTechnologiesScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  // Convertir a string para búsquedas en texto
  const techString = (Array.isArray(technologies) ? technologies : []).map((t: any) => (t.name || '') + ' ' + (t.description || '')).join(' ').toLowerCase();
  
  // 1. Arquitectura (4000 pts)
  // CORRECCIÓN: Soporta tanto "technology" (tu DB) como "memory_type" como fallback
  const memType = (specs?.technology || specs?.memory_type || '').toString().toUpperCase();
  let arqPoints = 0;
  if (memType.includes('DDR5')) arqPoints = RAM_CONFIG.TECNOLOGIAS.ARQUITECTURA.SCORES.DDR5;
  else if (memType.includes('DDR4')) arqPoints = RAM_CONFIG.TECNOLOGIAS.ARQUITECTURA.SCORES.DDR4;
  else if (memType.includes('DDR3')) arqPoints = RAM_CONFIG.TECNOLOGIAS.ARQUITECTURA.SCORES.DDR3;
  
  // 2. Overclocking (3000 pts)
  const profileSupport = JSON.stringify(product?.profile_support || specs?.profile_support || '').toLowerCase();
  const hasXMP = profileSupport.includes('xmp') || techString.includes('xmp');
  const hasEXPO = profileSupport.includes('expo') || techString.includes('expo');
  
  let ocPoints = RAM_CONFIG.TECNOLOGIAS.OC.SCORES.NONE;
  if (hasXMP && hasEXPO) ocPoints = RAM_CONFIG.TECNOLOGIAS.OC.SCORES.BOTH;
  else if (hasXMP || hasEXPO) ocPoints = RAM_CONFIG.TECNOLOGIAS.OC.SCORES.ONE;
  
  // 3. Integridad de Datos (2000 pts)
  let eccPoints = 0;
  // CORRECCIÓN: Soporta tanto "ecc_support" (tu DB) como "ecc"
  const hasDedicatedEcc = specs?.ecc_support === true || specs?.ecc === true || specs?.ecc_support === 'true' || specs?.ecc === 'true';
  
  if (hasDedicatedEcc) {
    eccPoints = RAM_CONFIG.TECNOLOGIAS.INTEGRIDAD.SCORES.TRUE;
  } else if (techString.includes('on-die ecc')) {
    eccPoints = RAM_CONFIG.TECNOLOGIAS.INTEGRIDAD.SCORES.ON_DIE;
  }
  
  // 4. Disipación Térmica (1000 pts)
  let thermalPoints = 0;
  if (RAM_CONFIG.TECNOLOGIAS.TERMICA.KEYWORDS.some(k => techString.includes(k))) {
    thermalPoints = RAM_CONFIG.TECNOLOGIAS.TERMICA.POINTS;
  }
  
  const totalPoints = arqPoints + ocPoints + eccPoints + thermalPoints;
  return formatNoteScore(Math.min(10, (totalPoints / RAM_CONFIG.TECNOLOGIAS.TOTAL_POINTS) * 10));
};