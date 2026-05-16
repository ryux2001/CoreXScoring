/**
 * GPU CONFIGURATION
 * Pesos y techos para cálculo de notas GPU
 */

export const GPU_CONFIG = {
  // Potency Score Configuration (10000 pts total)
  POTENCIA: {
    BENCHMARKS: {
      POINTS: 6000,
      WEIGHTS: {
        timeSpy: 4000,    // pts para Time Spy
        portRoyal: 2000,  // pts para Port Royal/Speed Way
      },
      MAX_VALUES: {
        timeSpy: 50000,   // techo Time Spy
        portRoyal: 38000, // techo Port Royal
      },
    },
    VRAM: {
      POINTS: 3000,
      WEIGHTS: {
        capacity: 1000,   // pts para capacidad VRAM
        type: 1000,       // pts para tipo de memoria
        bandwidth: 1000,  // pts para ancho de banda
      },
      MAX_VALUES: {
        capacity: 32,     // GB
      },
      TYPE_SCORES: {
        'GDDR7': 1000,
        'GDDR6X': 850,
        'GDDR6': 700,
        'GDDR5': 200,
      },
      BANDWIDTH_SCORES: {
        512: 1000,
        256: 800,
        192: 600,
        128: 400,
      },
    },
    CHIP: {
      POINTS: 1000,
      WEIGHTS: {
        tflops: 500,      // pts para TFLOPS
        frequency: 500,   // pts para frecuencia
      },
      MAX_VALUES: {
        tflops: 100,      // TFLOPS FP32
        frequency: 3000,  // MHz
      },
    },
    TOTAL_POINTS: 10000,
  },
  
  // Technologies Score Configuration (10000 pts total)
  TECNOLOGIAS: {
    PLATFORM: {
      POINTS: 3000,
      WEIGHTS: {
        pcie: 2000,       // pts para PCIe
        apis: 1000,       // pts para APIs
      },
      PCIE_SCORES: {
        5.0: 2000,
        4.0: 1400,
        3.0: 700,
      },
    },
    AGE_PENALTY: {
      POINTS: 2000,
      PENALTY_PER_YEAR: 200,
    },
    
    // MODIFICADO: Sistema de Tiers de Software para abrir brecha competitiva
    VIP_SOFTWARE: {
      POINTS: 5000,
      
      // Categoría 1: Generación de Fotogramas y escalado avanzado
      CAT_1_PREMIUM_POINTS: 1250,
      CAT_1_PREMIUM_KEYWORDS: ['dlss4', 'dlss 4.5', 'dlss 4'], // Exclusivo nueva gen NVIDIA
      CAT_1_STANDARD_POINTS: 750,
      CAT_1_STANDARD_KEYWORDS: ['frame generation', 'xess 2', 'xess 3', 'afmf', 'fsr3', 'fsr 4', 'fsr 4.1', 'dlss3', 'dlss 3.5'],

      // Categoría 2: IA Avanzada (Fijo)
      CAT_2_POINTS: 1250,
      CAT_2_KEYWORDS: ['ia', 'ai', 'tensor', 'redes neuronales', 'mxm', 'transformer', 'neural networks'],

      // Categoría 3: Trazado de Rayos Reconstruido vs Tradicional
      CAT_3_PREMIUM_POINTS: 1250,
      CAT_3_PREMIUM_KEYWORDS: ['ray reconstruction', 'path tracing'], // Trazado premium por IA
      CAT_3_STANDARD_POINTS: 600,
      CAT_3_STANDARD_KEYWORDS: ['ray tracing', 'trazado de rayos'],   // Hardware RT convencional

      // Categoría 4: Latencia y ecosistema (Fijo)
      CAT_4_POINTS: 1250,
      CAT_4_KEYWORDS: ['reflex', 'anti-lag', 'baja latencia', 'low latency', 'deep link', 'av1'],
    },
    TOTAL_POINTS: 10000,
  },
  
  // Productivity Score Configuration (10000 pts total)
  PRODUCTIVIDAD: {
    RENDERING: {
      POINTS: 4500,
      WEIGHTS: { blender: 4500 },
      MAX_VALUES: { blender: 20000 },
    },
    VRAM_CAPACITY: {
      POINTS: 3500,
      WEIGHTS: { capacity: 3500 },
      MAX_VALUES: { capacity: 32 },
    },
    BRUTE_FORCE: {
      POINTS: 1000,
      WEIGHTS: { tflops: 1000 },
      MAX_VALUES: { tflops: 100 },
    },
    ACCELERATION: {
      POINTS: 1000,
      KEYWORDS: ['machine learning', 'ia', 'ai', 'redes neuronales', 'neural networks', 'av1', 'tensor'],
    },
    TOTAL_POINTS: 10000,
  },
  
  // Gaming Score Configuration (10000 pts total)
  JUEGOS: {
    RASTERIZATION: {
      POINTS: 4500,
      WEIGHTS: { timeSpy: 4500 },
      MAX_VALUES: { timeSpy: 50000 },
    },
    RAY_TRACING: {
      POINTS: 2500,
      WEIGHTS: { portRoyal: 2500 },
      MAX_VALUES: { portRoyal: 38000 },
    },
    TEXTURES: {
      POINTS: 1500,
      WEIGHTS: { capacity: 1500 },
      MAX_VALUES: { capacity: 24 },
    },
    FPS_TECH: {
      POINTS: 1500,
      TIER_1_POINTS: 1500,
      TIER_1_KEYWORDS: ['dlss 4', 'dlss 4.5', 'fsr 4.1'],
      TIER_2_POINTS: 1200,
      TIER_2_KEYWORDS: ['dlss 3', 'dlss 3.5', 'fsr 4'],
      TIER_3_POINTS: 800,
      TIER_3_KEYWORDS: ['fsr 3', 'xess', 'fsr 2'],
    },
    TOTAL_POINTS: 10000,
  },
  
  // Efficiency Score Configuration (10000 pts total)
  EFICIENCIA: {
    RATIO: {
      POINTS: 7000,
      MAX_RATIO: 120,
    },
    FOOTPRINT: {
      POINTS: 3000,
      MIN_WATTAGE: 0,
      MAX_WATTAGE: 600,
      PENALTY_FACTOR: 450,
    },
    TOTAL_POINTS: 10000,
  },
  
  // Calidad/Precio - Pesos de cada nota
  VALUE_WEIGHTS: {
    POTENCIA_WEIGHT: 35,
    TECNOLOGIAS_WEIGHT: 0,
    PRODUCTIVIDAD_WEIGHT: 25,
    JUEGOS_WEIGHT: 40,
    EFICIENCIA_WEIGHT: 0,
    TOTAL: 100,
  },
};