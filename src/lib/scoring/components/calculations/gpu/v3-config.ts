/**
 * GPU scoring v3 configuration.
 *
 * The reference values are deliberately fixed instead of being calculated
 * from the current catalogue. Adding a new product therefore does not move
 * every existing score.
 */

export type GpuArchitectureFamily =
  | 'ampere'
  | 'ada'
  | 'blackwell'
  | 'rdna2'
  | 'rdna3'
  | 'rdna4'
  | 'xe2'
  | 'unknown';

export type GpuCapabilityProfile = {
  scaling: number;
  rayTracingAi: number;
  media: number;
  latency: number;
  ecosystem: number;
  creator: number;
  gamingTechnology: number;
};

export const GPU_SCORING_V3 = {
  NORMALIZATION: {
    RASTERIZATION: { low: 3000, high: 50000 },
    RAY_TRACING: { low: 250, high: 36000 },
    PRODUCTIVITY: { low: 250, high: 18000 },
    EFFICIENCY: { low: 40, high: 115 },
  },
  WEIGHTS: {
    PRODUCTIVITY: { blender: 0.7, vram: 0.2, creator: 0.1 },
    GAMING: { rasterization: 0.55, rayTracing: 0.25, vram: 0.12, technology: 0.08 },
    TECHNOLOGIES: {
      scaling: 0.3,
      rayTracingAi: 0.25,
      media: 0.15,
      latency: 0.1,
      ecosystem: 0.2,
    },
  },
  VRAM_ANCHORS: [
    [4, 2],
    [6, 4],
    [8, 6],
    [10, 7],
    [12, 8],
    [16, 9.25],
    [20, 9.75],
    [24, 10],
    [32, 10],
  ] as const,
} as const;

/**
 * Capability baselines are architecture-level facts, not a count of strings
 * in the product description. SKU descriptions may be incomplete or contain
 * marketing claims, so they must not move an otherwise identical generation.
 */
export const GPU_CAPABILITY_PROFILES: Record<GpuArchitectureFamily, GpuCapabilityProfile> = {
  ampere: {
    scaling: 5,
    rayTracingAi: 6.5,
    media: 6,
    latency: 8,
    ecosystem: 9.8,
    creator: 8.2,
    gamingTechnology: 6.5,
  },
  ada: {
    scaling: 8.5,
    rayTracingAi: 8.5,
    media: 9,
    latency: 8.5,
    ecosystem: 9.5,
    creator: 9.5,
    gamingTechnology: 8.5,
  },
  blackwell: {
    scaling: 10,
    rayTracingAi: 10,
    media: 9.5,
    latency: 10,
    ecosystem: 10,
    creator: 10,
    gamingTechnology: 10,
  },
  rdna2: {
    scaling: 4,
    rayTracingAi: 4.5,
    media: 5,
    latency: 6,
    ecosystem: 5.5,
    creator: 4.8,
    gamingTechnology: 5,
  },
  rdna3: {
    scaling: 7,
    rayTracingAi: 6.5,
    media: 8.5,
    latency: 7,
    ecosystem: 5.5,
    creator: 6.3,
    gamingTechnology: 6.8,
  },
  rdna4: {
    scaling: 9,
    rayTracingAi: 8.5,
    media: 9,
    latency: 8.5,
    ecosystem: 8.5,
    creator: 7.5,
    gamingTechnology: 8.7,
  },
  xe2: {
    scaling: 8,
    rayTracingAi: 7.5,
    media: 8.5,
    latency: 7,
    ecosystem: 7,
    creator: 7.3,
    gamingTechnology: 8,
  },
  unknown: {
    scaling: 0,
    rayTracingAi: 0,
    media: 0,
    latency: 0,
    ecosystem: 0,
    creator: 0,
    gamingTechnology: 0,
  },
};
