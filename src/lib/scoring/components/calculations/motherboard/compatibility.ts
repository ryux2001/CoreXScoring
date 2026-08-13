/**
 * MOTHERBOARD COMPATIBILITY SCORE CALCULATOR
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { formatNoteScore } from '../../../shared/helpers';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateCompatibilityScore = (product: any): number => {
  const compatibility = parseJsonbString(product?.compatibility || '{}');
  
  const { SOCKET, RAM, TOTAL_POINTS } = MOTHERBOARD_CONFIG.COMPATIBILIDAD;

  // 1. Longevidad del Socket (5000 pts)
  const socketStr = (Array.isArray(compatibility?.socket) ? compatibility.socket : []).join(' ').toLowerCase();
  let socketPts = SOCKET.DEAD;
  if (socketStr.includes('am5')) socketPts = SOCKET.AM5;
  else if (socketStr.includes('1851')) socketPts = SOCKET.LGA1851;
  else if (socketStr.includes('am4')) socketPts = SOCKET.AM4;
  else if (socketStr.includes('1700')) socketPts = SOCKET.LGA1700;

  // 2. Soporte y Techo de Memoria RAM (5000 pts)
  const ramSupport = Array.isArray(compatibility?.ram_support) ? compatibility.ram_support : [];
  let maxRamSpeed = 0;
  
  ramSupport.forEach((ramStr: string) => {
    // Extraer número de 4 dígitos (ej: "DDR5-8000 (OC)" -> 8000)
    const match = ramStr.match(/(\d{4,})/);
    if (match) {
      const speed = parseInt(match[1], 10);
      if (speed > maxRamSpeed) maxRamSpeed = speed;
    }
  });
  
  if (maxRamSpeed === 0) maxRamSpeed = 3200; // Fallback de seguridad DDR4 base
  
  const ramPoints = Math.min(RAM.MAX_POINTS, (maxRamSpeed / RAM.MAX_SPEED) * RAM.MAX_POINTS);

  const totalPoints = socketPts + ramPoints;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};