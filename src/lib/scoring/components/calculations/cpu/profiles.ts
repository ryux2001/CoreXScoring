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

export type CpuFairPriceModel = {
  intercept: number;
  utilitySlope: number;
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
 * Versioned log-linear fair-price models fitted offline to the 66 priced CPUs.
 * MSRP is a calibration input only; an individual product's MSRP never enters
 * the runtime score. Fair price is exp(intercept + utilitySlope * utility).
 */
export const CPU_VALUE_FAIR_PRICE_MODELS: Record<CpuValueProfile, CpuFairPriceModel> = {
  balanced: {
    intercept: 4.121929033922798,
    utilitySlope: 0.2647010271108512,
  },
  gaming: {
    intercept: 3.8831317571530812,
    utilitySlope: 0.2882655909149965,
  },
  productivity: {
    intercept: 4.486911732428424,
    utilitySlope: 0.219069818559873,
  },
};

export const CPU_VALUE_SCORING_VERSION = 2;

export function isCpuValueProfile(value: unknown): value is CpuValueProfile {
  return CPU_VALUE_PROFILE_OPTIONS.some((option) => option.value === value);
}
