import {
  clampScore,
  getFiniteNumber,
  getGpuData,
  getGpuVramCapacityScore,
  interpolateScore,
} from './score-utils';

const VRAM_CAPACITY_CEILING_GB = 24;

const BUS_SCORE_ANCHORS = [
  [64, 2],
  [128, 4],
  [192, 6],
  [256, 8],
  [384, 9.5],
  [512, 10],
] as const;

function calculateVramTypeScore(vramType: string): number {
  return {
    GDDR7: 10,
    GDDR6X: 8.5,
    GDDR6: 7,
    GDDR5: 3,
  }[vramType] ?? 0;
}

export function calculateMemoryScore(product: any): number {
  const { specs } = getGpuData(product);
  const vramCapacity = getFiniteNumber(specs.vram_capacity ?? specs.vram_gb) ?? 0;
  const busWidth = getFiniteNumber(specs.bus_width) ?? 0;
  const vramType = String(specs.vram_type ?? specs.memory_type ?? '').toUpperCase();

  const capacityScore = Math.min(10, (vramCapacity / VRAM_CAPACITY_CEILING_GB) * 10);
  const busScore = interpolateScore(busWidth, BUS_SCORE_ANCHORS);
  const typeScore = calculateVramTypeScore(vramType);

  return clampScore(
    capacityScore * 0.45 +
      busScore * 0.4 +
      typeScore * 0.15,
  );
}

/**
 * Gaming/productivity VRAM headroom score.
 *
 * Capacity is intentionally kept separate from bus width and memory type:
 * the catalogue does not contain memory bandwidth, and a raw bus-width score
 * would underrate newer memory standards unfairly.
 */
export function calculateVramAdequacyScore(product: any): number {
  const { specs } = getGpuData(product);
  const vramCapacity = getFiniteNumber(specs.vram_capacity ?? specs.vram_gb) ?? 0;

  return getGpuVramCapacityScore(vramCapacity);
}
