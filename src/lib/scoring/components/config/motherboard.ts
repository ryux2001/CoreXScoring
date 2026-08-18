/**
 * MOTHERBOARD SCORING CONFIGURATION
 *
 * The active formulas use explicit weights and diminishing-return anchors.
 * A few legacy maxima remain because metricsProducts exposes them as display
 * references; they are not used as hidden scoring ceilings.
 */

export const MOTHERBOARD_CONFIG = {
  ESTABILIDAD: {
    // Public display references kept for metricsProducts.
    FASES: { MAX_PHASES: 24, MAX_POINTS: 4000 },
    CALIDAD: { MAX_RATING: 10, MAX_POINTS: 4000 },
    ARQUITECTURA: {
      MAX_POINTS: 2000,
      BASIC_POINTS: 1000,
      KEYWORDS: ['drmos', '70a', '80a', '90a', '105a'],
    },
    WEIGHTS: { VRM_QUALITY: 0.45, THERMAL: 0.30, CPU_PHASES: 0.20, ARCHITECTURE: 0.05 },
    CPU_PHASE_ANCHORS: [[4, 3.5], [6, 5], [8, 6.5], [10, 7.7], [12, 8.6], [14, 9.2], [16, 9.7], [18, 10]] as const,
    ARCHITECTURE_ANCHORS: [[0, 6], [70, 8.5], [80, 9], [90, 9.5], [105, 10]] as const,
    TOTAL_POINTS: 10000,
  },
  EXPANSION: {
    // Legacy display references retained for compatibility.
    GPU: { MAX_POINTS: 4000, GEN5: 4000, GEN4: 2500, GEN3: 1000 },
    M2: { MAX_POINTS: 4000, GEN5_PER_SLOT: 2000, GEN4_PER_SLOT: 1000 },
    SECUNDARIOS: {
      MAX_POINTS: 2000,
      LARGE_GEN4: 1000,
      LARGE_GEN3: 500,
      SMALL_GEN4: 500,
      SMALL_GEN3: 250,
    },
    WEIGHTS: { PRIMARY_GPU: 0.32, M2: 0.43, SECONDARY_PCIE: 0.25 },
    M2_MARGINALS: [3.4, 2.2, 1.5, 1, 0.6] as const,
    M2_REFERENCE_UTILITY: 9,
    SECONDARY_REFERENCE_UTILITY: 8,
    TOTAL_POINTS: 10000,
  },
  CONECTIVIDAD: {
    WIFI: { MAX_POINTS: 3000, WIFI7: 3000, WIFI6E: 2500, WIFI6: 2000, NONE: 0 },
    LAN: { MAX_POINTS: 3000, LAN10G: 3000, LAN5G: 2500, LAN2_5G: 2000, LAN1G: 1000 },
    USB: {
      MAX_POINTS: 4000,
      USB_C_THUNDERBOLT: 2000,
      USB_C: 1000,
      USB_3: 200,
      USB_2: 50,
    },
    WEIGHTS: { WIFI: 0.22, LAN: 0.22, USB: 0.36, ADVANCED_IO: 0.20 },
    USB_ANCHORS: [[2, 2.5], [4, 4.5], [6, 6.2], [8, 7.7], [10, 8.8], [12, 9.6], [14, 10]] as const,
    TOTAL_POINTS: 10000,
  },
  TECNOLOGIAS: {
    // Legacy display references retained for compatibility.
    AUDIO: { MAX_POINTS: 4000, PREMIUM: 4000, MID: 2500, ENTRY: 1500 },
    BIOS: { MAX_POINTS: 4000, FLASHBACK: 2000, QLED: 2000 },
    SOFTWARE: { MAX_POINTS: 2000, POINTS_PER_FEATURE: 1000 },
    WEIGHTS: {
      AUDIO: 0.25,
      BIOS_RECOVERY: 0.25,
      DIAGNOSTICS: 0.20,
      BUILD_CONVENIENCE: 0.10,
      TUNING: 0.10,
      BOOT: 0.10,
    },
    BOOT_ANCHORS: [[13, 10], [14, 9], [15, 8], [16, 7], [17, 6], [18, 5], [19, 4], [20, 3], [21, 2], [22, 1]] as const,
    TOTAL_POINTS: 10000,
  },
  COMPATIBILIDAD: {
    SOCKET: {
      AM5: 10,
      LGA1851: 8,
      AM4: 4.2,
      LGA1700: 4.8,
      DEAD: 3,
    },
    RAM: { MAX_POINTS: 5000, MAX_SPEED: 9200 },
    RAM_DDR5_ANCHORS: [[6000, 6], [6800, 7], [7600, 8], [8000, 8.7], [8400, 9.2], [8800, 9.7], [9200, 10]] as const,
    RAM_DDR4_ANCHORS: [[3200, 4], [4600, 5.5], [5100, 6.3], [5400, 6.7]] as const,
    PCIE_GENERATION_SCORES: { GEN5: 10, GEN4: 7.5, GEN3: 5, UNKNOWN: 3 },
    WEIGHTS: { SOCKET: 0.55, MEMORY: 0.25, PCIE_READINESS: 0.20 },
    TOTAL_POINTS: 10000,
  },
  VALUE_WEIGHTS: {
    ESTABILIDAD: 22,
    EXPANSION: 19,
    CONECTIVIDAD: 16,
    TECNOLOGIAS: 13,
    COMPATIBILIDAD: 30,
  },
  VALUE_REFERENCE_PRICE_USD: 180,
  VALUE_PRICE_EXPONENT: 0.68,
  VALUE_LOGISTIC_OFFSET: 0.75,
  VALUE_LONGEVITY_BASE: 0.75,
  VALUE_LONGEVITY_WEIGHT: 0.25,
};
