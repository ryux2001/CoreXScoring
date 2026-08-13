import { safeExtract } from '../../../shared/validators';
import { GPU_CONFIG } from '../../config/gpu';
import { clampScore, parseJsonb } from './score-utils';

const BUS_SCORE_ANCHORS = [
  [64, 2],
  [128, 4],
  [192, 6],
  [256, 8],
  [384, 9.5],
  [512, 10],
] as const;

function interpolateBusScore(busWidth: number): number {
  const first = BUS_SCORE_ANCHORS[0];
  const last = BUS_SCORE_ANCHORS[BUS_SCORE_ANCHORS.length - 1];

  if (busWidth <= first[0]) return first[1];
  if (busWidth >= last[0]) return last[1];

  for (let index = 1; index < BUS_SCORE_ANCHORS.length; index += 1) {
    const lower = BUS_SCORE_ANCHORS[index - 1];
    const upper = BUS_SCORE_ANCHORS[index];

    if (busWidth <= upper[0]) {
      const progress = (busWidth - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + (upper[1] - lower[1]) * progress;
    }
  }

  return 0;
}

export function calculateMemoryScore(product: any): number {
  const specs = parseJsonb<Record<string, unknown>>(product?.specs, {});
  const vramCapacity = safeExtract(specs?.vram_capacity, 0);
  const busWidth = safeExtract(specs?.bus_width, 0);
  const vramType = String(specs?.vram_type ?? '').toUpperCase();

  const capacityScore = Math.min(
    10,
    (vramCapacity / GPU_CONFIG.POTENCIA.VRAM.MAX_VALUES.capacity) * 10,
  );
  const busScore = interpolateBusScore(busWidth);
  const typeScore = {
    GDDR7: 10,
    GDDR6X: 8.5,
    GDDR6: 7,
    GDDR5: 3,
  }[vramType] ?? 0;

  return clampScore(capacityScore * 0.7 + busScore * 0.2 + typeScore * 0.1);
}
