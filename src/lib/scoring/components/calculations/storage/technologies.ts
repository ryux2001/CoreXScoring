/**
 * STORAGE TECHNOLOGIES SCORE CALCULATOR
 */

import { STORAGE_CONFIG } from '../../config/storage';
import { formatNoteScore } from '../../../shared/helpers';
import { safeExtract } from '../../../shared/validators';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateTechnologiesScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const compatibility = parseJsonbString(product?.compatibility || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  const { PCIE, NAND, CACHE, TOTAL_POINTS } = STORAGE_CONFIG.TECNOLOGIAS;

  // 1. Interfaz y Generación PCIe (5000 pts)
  const pcieGen = parseFloat(safeExtract(compatibility?.pcie_generation, 3.0).toString());
  let pciePoints = PCIE.GEN3_SATA;
  if (pcieGen >= 5.0) pciePoints = PCIE.GEN5;
  else if (pcieGen >= 4.0) pciePoints = PCIE.GEN4;

  // 2. Tipo de Memoria NAND (3000 pts)
  const nandType = (specs?.nand_type || '').toString().toLowerCase();
  let nandPoints = 0;
  if (nandType.includes('tlc') || nandType.includes('mlc')) {
    nandPoints = NAND.HIGH;
  } else if (nandType.includes('qlc') || nandType.includes('3d nand')) {
    nandPoints = NAND.MID;
  }

  // 3. Gestión de Caché Inteligente (Hasta 2000 pts)
  const techArray = Array.isArray(technologies) ? technologies : [];
  let validCacheFeatures = 0;

  // Evaluamos cada tecnología por separado buscando términos reales de hardware
  techArray.forEach((t: any) => {
    const text = ((t.name || '') + ' ' + (t.description || '')).toLowerCase();
    
    // Si encuentra al menos una coincidencia con nuestro diccionario VIP de caché
    if (CACHE.KEYWORDS.some((kw: string) => text.includes(kw))) {
      validCacheFeatures++;
    }
  });

  const cachePoints = Math.min(CACHE.MAX_POINTS, validCacheFeatures * CACHE.POINTS_PER_TECH);

  // 4. Suma y normalización
  const totalPoints = pciePoints + nandPoints + cachePoints;
  
  // Normalizado sobre 10,000 exactos
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};