export const CPU_VALUE_PROFILE_EVENT = 'updateCpuValueProfile';

export const CPU_VALUE_PROFILE_OPTIONS = [
  {
    value: 'balanced',
    label: 'Equilibrada',
    description: 'Rendimiento general para decidir con una visión amplia.',
  },
  {
    value: 'gaming',
    label: 'Gaming',
    description: 'Da más peso al rendimiento gaming del procesador.',
  },
  {
    value: 'productivity',
    label: 'Productividad',
    description: 'Prioriza el rendimiento multinúcleo y las cargas profesionales.',
  },
] as const;

export type CpuValueProfile = (typeof CPU_VALUE_PROFILE_OPTIONS)[number]['value'];

export type CpuValueWeights = {
  potency: number;
  productivity: number;
  gaming: number;
  efficiency: number;
  platform: number;
};

/**
 * The value utility is intentionally based on the five visible technical
 * notes. Efficiency and platform inform the decision without overwhelming
 * clear performance differences between neighbouring CPUs.
 */
export const CPU_VALUE_WEIGHTS: Record<CpuValueProfile, CpuValueWeights> = {
  balanced: {
    potency: 0.25,
    productivity: 0.25,
    gaming: 0.3,
    efficiency: 0.1,
    platform: 0.1,
  },
  gaming: {
    potency: 0.15,
    productivity: 0,
    gaming: 0.65,
    efficiency: 0.08,
    platform: 0.12,
  },
  productivity: {
    potency: 0.18,
    productivity: 0.65,
    gaming: 0,
    efficiency: 0.1,
    platform: 0.07,
  },
};

/**
 * Fixed medians of utility / MSRP for the 66 priced CPUs in the catalogue.
 * Keeping these constants versioned prevents a newly inserted CPU from
 * moving every existing quality-price score at runtime.
 */
export const CPU_VALUE_REFERENCE_RATIOS: Record<CpuValueProfile, number> = {
  balanced: 0.019031935393620886,
  gaming: 0.019020061561430456,
  productivity: 0.017469089587323804,
};

export const CPU_VALUE_SCORING_VERSION = 1;
export const CPU_VALUE_LOGISTIC_EXPONENT = 2;

export function isCpuValueProfile(value: unknown): value is CpuValueProfile {
  return CPU_VALUE_PROFILE_OPTIONS.some((option) => option.value === value);
}
