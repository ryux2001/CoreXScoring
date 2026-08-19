export const GPU_VALUE_PROFILE_EVENT = 'updateGpuValueProfile';

export const GPU_VALUE_PROFILE_OPTIONS = [
  {
    value: 'balanced',
    label: 'Equilibrada',
    description: 'Rendimiento general para decidir con una visión amplia.',
  },
  {
    value: 'gaming',
    label: 'Gaming',
    description: 'Da más peso al rendimiento gaming y a sus tecnologías.',
  },
  {
    value: 'creation',
    label: 'Creación',
    description: 'Prioriza productividad, eficiencia y tecnologías para cargas creativas.',
  },
] as const;

export type GpuValueProfile = (typeof GPU_VALUE_PROFILE_OPTIONS)[number]['value'];

export type GpuValueWeights = {
  rasterization: number;
  productivity: number;
  gaming: number;
  efficiency: number;
  technologies: number;
};

export type GpuFairPriceModel = {
  intercept: number;
  utilitySlope: number;
};

/**
 * Profile weights for the five visible GPU technical notes.
 *
 * Efficiency remains part of every profile, but is deliberately restrained:
 * it must inform value without reversing clear performance tiers because of a
 * large TDP difference between adjacent SKUs.
 */
export const GPU_VALUE_WEIGHTS: Record<GpuValueProfile, GpuValueWeights> = {
  balanced: {
    rasterization: 0.2,
    productivity: 0.22,
    gaming: 0.35,
    efficiency: 0.08,
    technologies: 0.15,
  },
  gaming: {
    rasterization: 0.2,
    productivity: 0,
    gaming: 0.56,
    efficiency: 0.09,
    technologies: 0.15,
  },
  creation: {
    rasterization: 0.1,
    productivity: 0.64,
    gaming: 0,
    efficiency: 0.06,
    technologies: 0.2,
  },
};

/** Versioned offline fair-price models for the 51 priced GPUs. */
export const GPU_VALUE_FAIR_PRICE_MODELS: Record<GpuValueProfile, GpuFairPriceModel> = {
  balanced: {
    intercept: 4.3804121923748385,
    utilitySlope: 0.28469060436497984,
  },
  gaming: {
    intercept: 4.4012011204435595,
    utilitySlope: 0.2806701556376565,
  },
  creation: {
    intercept: 4.523431585142381,
    utilitySlope: 0.26241687025975713,
  },
};

export const GPU_VALUE_SCORING_VERSION = 4;

export function isGpuValueProfile(value: unknown): value is GpuValueProfile {
  return GPU_VALUE_PROFILE_OPTIONS.some((option) => option.value === value);
}
