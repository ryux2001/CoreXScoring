/**
 * RAM CONFIGURATION
 * Pesos y techos para cálculo de notas de memoria RAM
 */

export const RAM_CONFIG = {
  VELOCIDAD: {
    FRECUENCIA: { POINTS: 5000, MAX_MHZ: 8400 },
    ANCHO_BANDA: { POINTS: 5000, MAX_GBPS: 100 },
    TOTAL_POINTS: 10000,
  },
  TECNOLOGIAS: {
    ARQUITECTURA: {
      POINTS: 4000,
      SCORES: { 'DDR5': 4000, 'DDR4': 2000, 'DDR3': 500 },
    },
    OC: {
      POINTS: 3000,
      SCORES: { BOTH: 3000, ONE: 2000, NONE: 500 },
    },
    INTEGRIDAD: {
      POINTS: 2000,
      SCORES: { TRUE: 2000, ON_DIE: 1000, NONE: 0 },
    },
    TERMICA: {
      POINTS: 1000,
      KEYWORDS: ['heat spreader', 'aluminum', 'heatsink', 'disipador'],
    },
    TOTAL_POINTS: 10000,
  },
  LATENCIA: {
    REAL: { POINTS: 6000, MAX_NS: 45, MIN_NS: 100 },
    TEORICA: { POINTS: 4000, MAX_NS: 8, MIN_NS: 16 },
    TOTAL_POINTS: 10000,
  },
  JUEGOS: {
    CAPACIDAD: { POINTS: 3000, MAX_GB: 32 },
    FRECUENCIA: { POINTS: 4000, MAX_MHZ: 8400 },
    ESTABILIDAD: { POINTS: 3000, MAX_NS: 45, MIN_NS: 100 },
    TOTAL_POINTS: 10000,
  },
  PRODUCTIVIDAD: {
    CAPACIDAD: { POINTS: 6000, MAX_GB: 64 },
    FLUJO: { POINTS: 4000, MAX_MHZ: 8400 },
    TOTAL_POINTS: 10000,
  },
  VALUE_WEIGHTS: {
    VELOCIDAD_WEIGHT: 20,
    LATENCIA_WEIGHT: 20,
    TECNOLOGIAS_WEIGHT: 10,
    JUEGOS_WEIGHT: 25,
    PRODUCTIVIDAD_WEIGHT: 25,
  },
  VALUE_CEILING: 0.035, // Techo de puntos útiles por dólar
};