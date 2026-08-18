/**
 * STORAGE CONFIGURATION
 * Pesos, anclas y límites para cálculo de notas de almacenamiento (SSD/HDD).
 * Los bloques históricos se mantienen como compatibilidad para consumidores
 * externos; las fórmulas activas usan NORMALIZATION, WEIGHTS y ANCHORS.
 */

export const STORAGE_CONFIG = {
  VELOCIDAD: {
    TEORICA: {
      READ_MAX: 15000,
      WRITE_MAX: 14000,
      POINTS_PER: 2500, // 2500 lectura + 2500 escritura
    },
    REAL: {
      READ_MAX: 15000,
      WRITE_MAX: 14000,
      POINTS_PER: 2500, // 2500 lectura + 2500 escritura
    },
    TOTAL_POINTS: 10000,
    NORMALIZATION: {
      READ_REFERENCE: 400,
      WRITE_REFERENCE: 400,
    },
  },
  TECNOLOGIAS: {
    // Compatibilidad con consumidores antiguos.
    PCIE: { MAX_POINTS: 5000, GEN5: 5000, GEN4: 3500, GEN3_SATA: 1500 },
    NAND: { MAX_POINTS: 3000, HIGH: 3000, MID: 1500 }, 
    // Compatibilidad con consumidores antiguos.
    CACHE: { 
      POINTS_PER_TECH: 500, 
      MAX_POINTS: 2000,
      KEYWORDS: ['cache', 'turbowrite', 'slc', 'dram', 'buffer', 'hmb', 'sram']
    },
    WEIGHTS: {
      INTERFACE: 0.35,
      NAND: 0.25,
      CACHE: 0.22,
      INTEGRITY: 0.18,
    },
    TOTAL_POINTS: 10000, 
  },
  TEMPERATURAS: {
    SEGURIDAD: { MAX_POINTS: 5000, MIN_TEMP: 40, MAX_TEMP: 85, RANGE: 45 },
    EFICIENCIA: { MAX_POINTS: 5000, PERFECT_RATIO: 200 }, 
    ANCHORS: [[45, 10], [50, 9.5], [55, 8.8], [65, 7], [70, 6], [80, 3.5], [85, 2], [90, 0]] as const,
    HEADROOM_WEIGHT: 0.88,
    FEATURE_WEIGHT: 0.12,
    TOTAL_POINTS: 10000,
  },
  DURABILIDAD: {
    PERFECT_TBW_PER_TB: 800,
    PER_TB_ANCHORS: [[80, 1.2], [220, 3.5], [320, 5], [600, 7.8], [800, 9.3], [1000, 10]] as const,
    ABSOLUTE_ANCHORS: [[80, 2], [220, 4], [600, 7], [1200, 9], [1600, 10]] as const,
    WEIGHTS: { PER_TB: 0.7, ABSOLUTE: 0.15, NAND: 0.1, INTEGRITY: 0.05 },
    TOTAL_POINTS: 10000,
  },
  EFICIENCIA: {
    // Compatibilidad con consumidores antiguos; la escala activa es 2.45–10.1.
    PERFECT_J_GB: 2.45,
    WORST_J_GB: 10.1,
    RANGE: 7.65,
    TOTAL_POINTS: 10000,
    ENERGY_ANCHORS: [[2.45, 10], [3.9, 8.8], [4.95, 7.5], [6.3, 6.3], [7.8, 4.8], [8.9, 3.7], [10.1, 2.5]] as const,
    LEGACY_SCALE_FACTOR: 10,
    MISSING_ESTIMATE_CAP: 7.7,
    WEIGHTS: { ENERGY: 0.7, THROUGHPUT: 0.2, POWER_FEATURE: 0.1 },
  },
  VALUE_WEIGHTS: {
    VELOCIDAD_WEIGHT: 32,
    DURABILIDAD_WEIGHT: 22,
    TECNOLOGIAS_WEIGHT: 18,
    TEMPERATURAS_WEIGHT: 13,
    EFICIENCIA_WEIGHT: 15,
  },
  VALUE_REFERENCE_PRICE_PER_TB: 120,
  VALUE_PRICE_EXPONENT: 0.65,
  VALUE_LOGISTIC_OFFSET: 0.85,
};
