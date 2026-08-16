/** CPU PLATFORM SCORE CALCULATOR */

import { CPU_SCORING_V3 } from './v3-config';
import {
  clampScore,
  getCpuData,
  getCpuSocket,
  getFiniteNumber,
  interpolateScore,
} from './score-utils';

function getRamTypeScore(value: unknown): number {
  const ramType = String(value ?? '').toUpperCase().replace(/\s+/g, '');

  if (ramType.includes('DDR5') && ramType.includes('DDR4')) {
    return CPU_SCORING_V3.PLATFORM.RAM_TYPE_SCORES['DDR4/DDR5'];
  }

  if (ramType.includes('DDR5')) {
    return CPU_SCORING_V3.PLATFORM.RAM_TYPE_SCORES.DDR5;
  }

  if (ramType.includes('DDR4')) {
    return CPU_SCORING_V3.PLATFORM.RAM_TYPE_SCORES.DDR4;
  }

  return 0;
}

/**
 * Platform v3 scores standards and upgrade capability, not marketing text.
 * The socket matrix is versioned and should only be revised when platform
 * support policy changes, never when a new CPU is inserted in the catalogue.
 */
export const calculatePlatformV3Score = (product: any): number => {
  const { compatibility } = getCpuData(product);
  const socket = getCpuSocket(product);
  const ramType = getRamTypeScore(compatibility.ram_type);
  const ramSpeed = interpolateScore(
    getFiniteNumber(compatibility.ram_frecuency) ?? 0,
    CPU_SCORING_V3.PLATFORM.RAM_SPEED_ANCHORS,
  );
  const pcieVersion = getFiniteNumber(compatibility.pcie) ?? 0;
  const pcie = CPU_SCORING_V3.PLATFORM.PCIE_SCORES[pcieVersion] ?? 0;
  const maxRam = interpolateScore(
    getFiniteNumber(compatibility.ram_max_support) ?? 0,
    CPU_SCORING_V3.PLATFORM.MAX_RAM_ANCHORS,
  );
  const socketScore = CPU_SCORING_V3.PLATFORM.SOCKET_SCORES[socket] ?? 0;

  return clampScore(
    socketScore * 0.35 +
      ramType * 0.2 +
      ramSpeed * 0.15 +
      pcie * 0.2 +
      maxRam * 0.1,
  );
};
