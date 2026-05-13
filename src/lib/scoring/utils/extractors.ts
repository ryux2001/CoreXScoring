/**
 * EXTRACTORS
 * Funciones para extraer datos del producto de forma segura
 */

import { 
  safeExtract, 
  safeArrayLength, 
  kbToMb,
  getProductType,
} from './helpers';

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
    type: getProductType(product),
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
    type: getProductType(product),
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
    type: getProductType(product),
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
    type: getProductType(product),
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
    type: getProductType(product),
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
    type: getProductType(product),
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
