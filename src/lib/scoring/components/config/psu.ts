/**
 * PSU SCORING CONFIGURATION
 *
 * Active thresholds and weights for the six PSU notes. The legacy ripple
 * fields remain available because the metrics panel reads them directly.
 */

export const PSU_CONFIG = {
  ESTABILIDAD: {
    RIZADO: {
      MAX_POINTS: 10000,
      PERFECT_MV: 8,
      WORST_MV: 80,
      RANGE: 72,
    },
    RIPPLE_ANCHORS: [
      [8, 10], [10, 9.8], [12, 9.5], [15, 9.1],
      [20, 8.3], [30, 7], [35, 6.2], [40, 5.4],
      [45, 4.5], [50, 3.5], [60, 2.3], [80, 1],
    ] as const,
    TOPOLOGIA: { LLC_DC: 10, SINGLE: 9, UNKNOWN: 8 },
    WEIGHTS: { RIPPLE: 0.95, TOPOLOGY: 0.05 },
    MISSING_SCORE: 6,
  },
  CONECTIVIDAD: {
    WEIGHTS: {
      PCIE_LEGACY: 0.34,
      GPU_MODERN: 0.22,
      EPS: 0.15,
      SATA: 0.07,
      MOLEX: 0.02,
      MODULARITY: 0.20,
    },
    CAPS: { PCIE_LEGACY: 5, SATA: 8, MOLEX: 4, EPS: 2 },
    NATIVE: { V2X6: 1, HPWR: 0.85, NONE: 0 },
    MODULARITY: { FULL: 1, SEMI: 0.65, NON: 0.25 },
    ATX_FALLBACK: { ATX3_1: 1, ATX3_0: 0.85, LEGACY: 0.5 },
    FALLBACK: { ATX_WEIGHT: 0.55, MODULARITY_WEIGHT: 0.45, MAX_SCORE: 6 },
  },
  PROTECCIONES: {
    CORE_WEIGHTS: {
      OCP: 18,
      OVP: 16,
      UVP: 16,
      OPP: 16,
      SCP: 16,
      OTP: 18,
    },
    CORE_SCORE: 9.2,
    EXTRA_SCORES: { SIP: 0.4, NLO: 0.4, BOP: 0.2 },
    MISSING_SCORE: 5,
  },
  CONSTRUCCION: {
    NOISE_ANCHORS: [
      [10, 10], [12, 9.7], [14, 9.4], [15, 9.2],
      [16, 9], [18, 8.6], [20, 8.1], [24, 7],
      [26, 6.3], [28, 5.7], [30, 5.1], [32, 4.6],
      [35, 3.8], [45, 2],
    ] as const,
    WEIGHTS: {
      RIPPLE: 0.20,
      TOPOLOGY: 0.25,
      COMPONENTS: 0.20,
      THERMAL: 0.20,
      WARRANTY: 0.15,
    },
    COMPONENT_SCORE: { PREMIUM: 10, UNKNOWN: 6.5 },
    FAN_SCORE: { PREMIUM: 9.5, SEMI_PASSIVE: 9, STANDARD: 7.5, UNKNOWN: 6.5 },
    WARRANTY_SCORE: { TEN_YEAR: 10, FIVE_YEAR: 8, UNKNOWN: 6.5 },
    MISSING_NOISE_SCORE: 6.5,
  },
  EFICIENCIA: {
    CERTIFICATION: {
      TITANIUM: 10,
      PLATINUM: 9.4,
      GOLD: 8.3,
      SILVER: 7.1,
      BRONZE: 6,
      WHITE: 4.5,
      UNKNOWN: 5,
    },
    LOAD_50_ANCHORS: [
      [80, 2.5], [82, 3.5], [85, 5], [87, 6.2],
      [88, 6.7], [90, 8], [91, 8.5], [92, 9],
      [93, 9.4], [95, 10],
    ] as const,
    WEIGHTS: { MEASURED: 0.75, CERTIFICATION: 0.25 },
    MISSING_MEASURED_SCORE: 6,
  },
  VALUE_WEIGHTS: {
    ESTABILIDAD: 0.28,
    PROTECCIONES: 0.22,
    CONSTRUCCION: 0.20,
    EFICIENCIA: 0.18,
    CONECTIVIDAD: 0.12,
  },
  VALUE_REFERENCE_PRICES: [
    [450, 45], [500, 55], [550, 65], [650, 75],
    [700, 85], [750, 110], [850, 140], [1000, 185],
    [1200, 230], [1500, 350],
  ] as const,
  VALUE_PRICE_EXPONENT: 0.65,
  VALUE_LOGISTIC_EXPONENT: 1.3,
  VALUE_LOGISTIC_OFFSET: 0.75,
};
