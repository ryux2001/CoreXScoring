/**
 * HELPERS
 * Funciones auxiliares reutilizables
 */

// Convertir KB a MB
export const kbToMb = (kb: number): number => kb / 1024;

// Normalizar valor a escala 0-1
export const normalizeValue = (value: number, max: number): number => {
  return max > 0 ? value / max : 0;
};

// Calcular puntos ponderados
export const calculateWeightedScore = (value: number, weight: number, maxWeight: number): number => {
  return value * (weight / maxWeight);
};

// Formatear nota final (0-10)
export const formatNoteScore = (score: number): number => {
  return Math.min(10, Math.max(0, score));
};

// Extraer tipo de componente
export const getProductType = (product: any): string => {
  return product?.type?.toUpperCase() || 'UNKNOWN';
};

// Extraer datos de CPU
export const getCpuData = (product: any) => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  return {
    benchmarks: {
      cinebench: safeExtract(benchmarks?.cinebench_multi, 0),
      geekbench: safeExtract(benchmarks?.geekbench_single, 0),
      passmark: safeExtract(benchmarks?.passmark_score, 0),
    },
    specs: {
      turbo: safeExtract(specs?.turbo_frequency, 0),
      threads: safeArrayLength(specs?.threads ? [specs.threads] : []),
      cache: kbToMb(safeExtract(specs?.cache?.l3, 0)),
    },
  };
};

// Extraer datos de GPU
export const getGpuData = (product: any) => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  return {
    benchmarks: {
      fps1080: safeExtract(benchmarks?.fps1080_gaming_avg_fps, 0),
      fps1440: safeExtract(benchmarks?.fps1440_gaming_avg_fps, 0),
      fps4k: safeExtract(benchmarks?.fps4k_gaming_avg_fps, 0),
      blender: safeExtract(benchmarks?.blender_score, 0),
      rayTracing: getRayTracingScore(benchmarks?.ray_tracing_performance),
    },
    specs: {
      cudaCores: safeExtract(specs?.cuda_cores_stream_processors, 0),
      vram: safeExtract(specs?.vram_capacity, 0),
      coreClock: safeExtract(specs?.core_clock, 0),
    },
  };
};

// Extraer datos de RAM
export const getRamData = (product: any) => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  return {
    benchmarks: {
      readSpeed: safeExtract(benchmarks?.read_speed, 0),
      writeSpeed: safeExtract(benchmarks?.write_speed, 0),
      latency: safeExtract(benchmarks?.latency_ns, 0),
    },
    specs: {
      speed: safeExtract(specs?.speed, 0),
      latency: parseInt(specs?.latency || '0', 10),
    },
  };
};

// Extraer datos de Storage
export const getStorageData = (product: any) => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  return {
    benchmarks: {
      readSpeed: safeExtract(benchmarks?.crystal_disk_read, 0),
      writeSpeed: safeExtract(benchmarks?.crystal_disk_write, 0),
      maxTemp: safeExtract(benchmarks?.max_temp_c, 0),
    },
    specs: {
      readSpeed: safeExtract(specs?.read_speed, 0),
      writeSpeed: safeExtract(specs?.write_speed, 0),
      tbw: safeExtract(specs?.tbw, 0),
    },
  };
};

// Extraer datos de Motherboard
export const getMotherboardData = (product: any) => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  return {
    benchmarks: {
      vrmThermal: getVrmThermalRating(benchmarks?.vrm_thermal_performance),
      bootTime: safeExtract(benchmarks?.boot_time_seconds, 0),
    },
    specs: {
      vrmQuality: safeExtract(specs?.vrm_quality_rating, 0),
      powerPhases: parseInt(specs?.power_phases?.replace(/[+-]/g, '').split('+').pop() || '0', 10),
      pcieSlots: specs?.pcie_slots?.filter((s: string) => s.includes('5.0'))?.length || 0,
    },
  };
};

// Extraer datos de PSU
export const getPsuData = (product: any) => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  return {
    benchmarks: {
      noiseLevel: safeExtract(benchmarks?.noise_level_db, 0),
      efficiency50: safeExtract(benchmarks?.efficiency_load_50, 0),
    },
    specs: {
      wattage: safeExtract(specs?.wattage, 0),
      efficiency: getEfficiencyRating(specs?.efficiency),
      protections: safeArrayLength(specs?.protections),
    },
  };
};

// Helpers internos
function getRayTracingScore(rating: string | undefined): number {
  if (!rating) return 5;
  const scale: Record<string, number> = {
    'veryhigh': 10, 'high': 8, 'medium': 6, 'low': 4, 'verylow': 2,
  };
  return scale[rating.toLowerCase()] || 5;
}

function getVrmThermalRating(rating: string | undefined): number {
  if (!rating) return 5;
  const scale: Record<string, number> = {
    'excellent': 10, 'good': 8, 'average': 6, 'poor': 4,
  };
  return scale[rating.toLowerCase()] || 5;
}

function getEfficiencyRating(rating: string | undefined): number {
  if (!rating) return 75;
  const scale: Record<string, number> = {
    'platinum': 95, 'gold': 90, 'silver': 80, 'bronze': 75,
  };
  return scale[rating.toLowerCase().replace('80+', '').trim()] || 75;
}

// Validar que el producto existe y es un objeto
export const validateProduct = (product: any): boolean => {
  return !!(product && typeof product === 'object');
};

// Validar que los benchmarks existen y son números
export const validateBenchmarks = (benchmarks: any): boolean => {
  if (typeof benchmarks !== 'object' || benchmarks === null) return false;
  return Object.keys(benchmarks).some(key => 
    typeof benchmarks[key] === 'number' && Number.isFinite(benchmarks[key])
  );
};

// Validar que las specs existen y son objetos válidos
export const validateSpecs = (specs: any): boolean => {
  if (typeof specs !== 'object' || specs === null) return false;
  return Object.keys(specs).some(key => 
    typeof specs[key] === 'number' || typeof specs[key] === 'string'
  );
};

// Extraer valor con fallback seguro
export const safeExtract = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return defaultValue;
};

// Extraer array y contar elementos
export const safeArrayLength = (arr: any[]): number => {
  if (Array.isArray(arr)) {
    return arr.length;
  }
  return 0;
};
