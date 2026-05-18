/**
 * STORAGE CONFIGURATION
 * Pesos y techos para cálculo de notas de almacenamiento (SSD/HDD)
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
  },
  TECNOLOGIAS: {
    // AJUSTE 1: Techos subidos para cuadrar los 10,000 puntos
    PCIE: { MAX_POINTS: 5000, GEN5: 5000, GEN4: 3500, GEN3_SATA: 1500 },
    NAND: { MAX_POINTS: 3000, HIGH: 3000, MID: 1500 }, 
    // AJUSTE 2: Diccionario de palabras clave para evitar marketing basura
    CACHE: { 
      POINTS_PER_TECH: 500, 
      MAX_POINTS: 2000,
      KEYWORDS: ['cache', 'turbowrite', 'slc', 'dram', 'buffer', 'hmb', 'sram']
    },
    TOTAL_POINTS: 10000, 
  },
  TEMPERATURAS: {
    SEGURIDAD: { MAX_POINTS: 5000, MIN_TEMP: 40, MAX_TEMP: 85, RANGE: 45 },
    EFICIENCIA: { MAX_POINTS: 5000, PERFECT_RATIO: 200 }, 
    TOTAL_POINTS: 10000,
  },
  DURABILIDAD: {
    PERFECT_TBW_PER_TB: 800,
    TOTAL_POINTS: 10000,
  },
  EFICIENCIA: {
    PERFECT_J_GB: 0.1,
    WORST_J_GB: 1.0,
    RANGE: 0.9,
    TOTAL_POINTS: 10000,
  },
  VALUE_WEIGHTS: {
    VELOCIDAD_WEIGHT: 35,
    DURABILIDAD_WEIGHT: 25,
    TECNOLOGIAS_WEIGHT: 15,
    TEMPERATURAS_WEIGHT: 15,
    EFICIENCIA_WEIGHT: 10,
  },
  VALUE_CEILING: 0.045, // Techo de puntos útiles ajustado para el nuevo umbral
};