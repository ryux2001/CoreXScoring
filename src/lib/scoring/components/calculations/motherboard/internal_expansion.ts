/**
 * MOTHERBOARD INTERNAL EXPANSION SCORE CALCULATOR
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { formatNoteScore } from '../../../shared/helpers';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateInternalExpansionScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const pcieSlots = Array.isArray(specs?.pcie_slots) ? specs.pcie_slots : [];
  const m2Slots = Array.isArray(specs?.m2_slots) ? specs.m2_slots : [];
  
  const { GPU, M2, SECUNDARIOS, TOTAL_POINTS } = MOTHERBOARD_CONFIG.EXPANSION;

  // 1. Puerto Principal (GPU) y 3. Puertos Secundarios
  let primaryGpuPts = 0;
  let primaryFound = false;
  let secondaryPts = 0;

  pcieSlots.forEach((slotStr: string) => {
    const s = slotStr.toLowerCase();
    const countMatch = s.match(/^(\d+)x/);
    const count = countMatch ? parseInt(countMatch[1]) : 1;

    for (let i = 0; i < count; i++) {
      // Identificar puerto principal (x16 real, sin restricciones como "x4 mode")
      if (!primaryFound && s.includes('x16') && !s.match(/\(x\d+\)/)) {
        if (s.includes('5.0')) primaryGpuPts = GPU.GEN5;
        else if (s.includes('4.0')) primaryGpuPts = GPU.GEN4;
        else primaryGpuPts = GPU.GEN3;
        primaryFound = true;
      } else {
        // Asignar a puertos secundarios
        if (s.includes('x16') || s.includes('x4')) { // Ranuras largas
          if (s.includes('4.0')) secondaryPts += SECUNDARIOS.LARGE_GEN4;
          else if (s.includes('3.0')) secondaryPts += SECUNDARIOS.LARGE_GEN3;
        } else if (s.includes('x1')) { // Ranuras cortas
          if (s.includes('4.0')) secondaryPts += SECUNDARIOS.SMALL_GEN4;
          else if (s.includes('3.0')) secondaryPts += SECUNDARIOS.SMALL_GEN3;
        }
      }
    }
  });

  secondaryPts = Math.min(secondaryPts, SECUNDARIOS.MAX_POINTS);

  // 2. Bahías M.2 (4000 pts)
  let m2Pts = 0;
  m2Slots.forEach((slotStr: string) => {
    const s = slotStr.toLowerCase();
    const countMatch = s.match(/^(\d+)x/);
    const count = countMatch ? parseInt(countMatch[1]) : 1;
    
    for (let i = 0; i < count; i++) {
      if (s.includes('5.0')) m2Pts += M2.GEN5_PER_SLOT;
      else if (s.includes('4.0')) m2Pts += M2.GEN4_PER_SLOT;
    }
  });
  
  m2Pts = Math.min(m2Pts, M2.MAX_POINTS);

  const totalPoints = primaryGpuPts + m2Pts + secondaryPts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};