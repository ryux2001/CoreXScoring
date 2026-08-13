/**
 * Combo scoring configuration.
 *
 * Keep all combo weights and correction factors here. The calculation files
 * should only describe how these values are applied to the component notes.
 * Values are intentionally unchanged from the previous implementation.
 */
export const SCORING_WEIGHTS = {
  POTENCY: {
    CPU: 0.40,
    GPU: 0.45,
    RAM_SPEED: 0.075,
    RAM_LATENCY: 0.075,
  },
  PRODUCTIVITY: {
    CPU: 0.40,
    GPU: 0.40,
    RAM: 0.20,
  },
  GAMING: {
    CPU: 0.30,
    GPU: 0.55,
    RAM: 0.15,
  },
  EFFICIENCY: {
    GPU: 0.60,
    CPU: 0.40,
  },
  BOTTLENECK: {
    DELTA_CPU_GPU: 0.75,
    DELTA_RAM: 0.25,
    FRICTION_MULTIPLIER: 1.2,
  },
} as const;
