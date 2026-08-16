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

/**
 * Fixed medians of Q / MSRP for the current 51-GPU catalogue.
 * Keeping these constants versioned prevents a new catalogue item from
 * moving every existing quality-price score at runtime.
 */
export const GPU_VALUE_REFERENCE_RATIOS: Record<GpuValueProfile, number> = {
  balanced: 0.013095814873344958,
  gaming: 0.01319906162060836,
  creation: 0.012983049822195886,
};

export const GPU_VALUE_SCORING_VERSION = 3;
export const GPU_VALUE_LOGISTIC_EXPONENT = 2;

export function isGpuValueProfile(value: unknown): value is GpuValueProfile {
  return GPU_VALUE_PROFILE_OPTIONS.some((option) => option.value === value);
}
