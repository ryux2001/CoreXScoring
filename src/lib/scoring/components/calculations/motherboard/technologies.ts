/**
 * MOTHERBOARD TECHNOLOGIES SCORE CALCULATOR
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { formatNoteScore } from '../../../shared/helpers';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateTechnologiesScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  const { AUDIO, BIOS, SOFTWARE, TOTAL_POINTS } = MOTHERBOARD_CONFIG.TECNOLOGIAS;

  // 1. Calidad del Chip de Audio (4000 pts)
  const audioStr = (specs?.audio_codec || '').toLowerCase();
  let audioPts = AUDIO.ENTRY; // Base si solo pone "Realtek"
  if (audioStr.includes('1220') || audioStr.includes('4080') || audioStr.includes('sabre')) {
    audioPts = AUDIO.PREMIUM;
  } else if (audioStr.includes('1200')) {
    audioPts = AUDIO.MID;
  } else if (audioStr.includes('897') || audioStr.includes('887')) {
    audioPts = AUDIO.ENTRY;
  }

  // 2. Diagnóstico y Mantenimiento (4000 pts)
  const biosStr = (Array.isArray(specs?.bios_features) ? specs.bios_features : []).join(' ').toLowerCase();
  let biosPts = 0;
  if (biosStr.includes('flashback')) biosPts += BIOS.FLASHBACK;
  if (biosStr.includes('q-led') || biosStr.includes('debug')) biosPts += BIOS.QLED;

  // 3. Extras de Software / IA (2000 pts)
  let softwarePts = 0;
  const techArray = Array.isArray(technologies) ? technologies : [];
  
  techArray.forEach((t: any) => {
    const desc = `${t.name || ''} ${t.description || ''}`.toLowerCase();
    // Excluir términos de hardware puro para aislar software
    const hwTerms = ['pcie', 'vrm', 'wi-fi', 'wifi', 'drmos', 'm.2', 'ethernet', 'lan', 'ddr5', 'ddr4', 'atx'];
    const isHardware = hwTerms.some(hw => desc.includes(hw));
    
    // Si contiene términos de IA, software o cancelación, lo premiamos
    if (!isHardware && ['ai ', 'noise cancelation', 'software', 'smart', 'auto'].some(k => desc.includes(k))) {
      softwarePts += SOFTWARE.POINTS_PER_FEATURE;
    }
  });
  
  softwarePts = Math.min(softwarePts, SOFTWARE.MAX_POINTS);

  const totalPoints = audioPts + biosPts + softwarePts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};