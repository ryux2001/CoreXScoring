import { CPU_CONFIG } from '@/lib/scoring/config/cpu';
import { GPU_SCORING_V3 } from '@/lib/scoring/config/gpu';
import { MOTHERBOARD_CONFIG } from '@/lib/scoring/config/motherboard';
import { PSU_CONFIG } from '@/lib/scoring/config/psu';
import { RAM_CONFIG } from '@/lib/scoring/config/ram';
import { STORAGE_CONFIG } from '@/lib/scoring/config/storage';

type JsonRecord = Record<string, unknown>;

export interface ProductForMetrics {
  type?: unknown;
  specs?: unknown;
  benchmarks?: unknown;
}

export interface ProductMetric {
  id: string;
  label: string;
  unit: string;
  value: number;
  max: number;
  min?: number;
  invert?: boolean;
}

export function getMetricPercentage(metric: ProductMetric): number {
  if (!Number.isFinite(metric.value) || metric.value <= 0) return 0;

  if (metric.invert && metric.min !== undefined) {
    const range = metric.max - metric.min;
    if (range <= 0) return 0;

    return Math.max(0, Math.min(100, ((metric.max - metric.value) / range) * 100));
  }

  if (metric.max <= 0) return 0;
  return Math.max(0, Math.min(100, (metric.value / metric.max) * 100));
}

const PSU_WATTAGE_MAX = 1500;

function parseJsonRecord(value: unknown): JsonRecord {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as JsonRecord
        : {};
    } catch {
      return {};
    }
  }

  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNumber(record: JsonRecord, key: string): number {
  return toFiniteNumber(record[key]);
}

function getCas(specs: JsonRecord): number {
  const rawLatency = specs.cas_latency ?? specs.latency;
  const match = String(rawLatency ?? '').match(/\d+(?:\.\d+)?/);
  return match ? toFiniteNumber(match[0]) : 0;
}

function getMotherboardPhases(specs: JsonRecord): number {
  const numericPhases = toFiniteNumber(specs.vrm_phases, NaN);
  if (Number.isFinite(numericPhases)) return numericPhases;

  const phases = String(specs.power_phases ?? '').match(/\d+(?:\.\d+)?/g);
  return phases?.reduce((total, phase) => total + toFiniteNumber(phase), 0) ?? 0;
}

function getCpuMetrics(benchmarks: JsonRecord): ProductMetric[] {
  return [
    {
      id: 'cinebench-multi',
      label: 'Cinebench R23 (Multi-Core)',
      unit: 'pts',
      value: getNumber(benchmarks, 'cinebench_multi'),
      max: CPU_CONFIG.MAX_VALUES.cinebench,
    },
    {
      id: 'geekbench-single',
      label: 'Geekbench (Single-Core)',
      unit: 'pts',
      value: getNumber(benchmarks, 'geekbench_single'),
      max: CPU_CONFIG.MAX_VALUES.geekbench,
    },
    {
      id: 'passmark',
      label: 'PassMark CPU Mark',
      unit: 'pts',
      value: getNumber(benchmarks, 'passmark_score'),
      max: CPU_CONFIG.MAX_VALUES.passmark,
    },
  ];
}

function getGpuMetrics(specs: JsonRecord, benchmarks: JsonRecord): ProductMetric[] {
  return [
    {
      id: 'time-spy',
      label: '3DMark Time Spy Score',
      unit: 'pts',
      value: getNumber(benchmarks, '3dmark_time_spy'),
      max: GPU_SCORING_V3.NORMALIZATION.RASTERIZATION.high,
    },
    {
      id: 'port-royal',
      label: '3DMark Port Royal (Ray Tracing)',
      unit: 'pts',
      value: getNumber(benchmarks, '3dmark_port_royal'),
      max: GPU_SCORING_V3.NORMALIZATION.RAY_TRACING.high,
    },
    {
      id: 'vram-capacity',
      label: 'Capacidad de VRAM',
      unit: 'GB',
      value: getNumber(specs, 'vram_capacity'),
      max: GPU_SCORING_V3.VRAM_ANCHORS[GPU_SCORING_V3.VRAM_ANCHORS.length - 1][0],
    },
  ];
}

function getRamMetrics(specs: JsonRecord): ProductMetric[] {
  const speed = getNumber(specs, 'speed');
  const theoreticalBandwidth = speed * 8;
  const cas = getCas(specs);
  const rawLatency = speed > 0 ? (cas / speed) * 2000 : 0;

  return [
    {
      id: 'ram-frequency',
      label: 'Frecuencia del Módulo',
      unit: 'MHz',
      value: speed,
      max: RAM_CONFIG.VELOCIDAD.FRECUENCIA.MAX_MHZ,
    },
    {
      id: 'ram-bandwidth',
      label: 'Ancho de Banda Teórico',
      unit: 'MB/s',
      value: theoreticalBandwidth,
      max: RAM_CONFIG.VELOCIDAD.ANCHO_BANDA.MAX_GBPS * 1000,
    },
    {
      id: 'ram-latency',
      label: 'Latencia Cruda Real',
      unit: 'ns',
      value: rawLatency,
      min: RAM_CONFIG.LATENCIA.REAL.MAX_NS,
      max: RAM_CONFIG.LATENCIA.REAL.MIN_NS,
      invert: true,
    },
  ];
}

function getStorageMetrics(specs: JsonRecord): ProductMetric[] {
  return [
    {
      id: 'storage-read',
      label: 'Velocidad de Lectura (Máx)',
      unit: 'MB/s',
      value: getNumber(specs, 'read_speed'),
      max: STORAGE_CONFIG.VELOCIDAD.TEORICA.READ_MAX,
    },
    {
      id: 'storage-write',
      label: 'Velocidad de Escritura (Máx)',
      unit: 'MB/s',
      value: getNumber(specs, 'write_speed'),
      max: STORAGE_CONFIG.VELOCIDAD.TEORICA.WRITE_MAX,
    },
  ];
}

function getMotherboardMetrics(specs: JsonRecord): ProductMetric[] {
  return [
    {
      id: 'motherboard-vrm-phases',
      label: 'Fases de Alimentación VRM',
      unit: 'Fases',
      value: getMotherboardPhases(specs),
      max: MOTHERBOARD_CONFIG.ESTABILIDAD.FASES.MAX_PHASES,
    },
    {
      id: 'motherboard-vrm-quality',
      label: 'Calidad de Construcción',
      unit: '/10',
      value: getNumber(specs, 'vrm_quality_rating'),
      max: MOTHERBOARD_CONFIG.ESTABILIDAD.CALIDAD.MAX_RATING,
    },
  ];
}

function getPsuMetrics(specs: JsonRecord): ProductMetric[] {
  return [
    {
      id: 'psu-ripple',
      label: 'Rizo Eléctrico (Línea 12V)',
      unit: 'mV',
      value: getNumber(specs, 'ripple_mv'),
      min: PSU_CONFIG.ESTABILIDAD.RIZADO.PERFECT_MV,
      max: PSU_CONFIG.ESTABILIDAD.RIZADO.WORST_MV,
      invert: true,
    },
    {
      id: 'psu-wattage',
      label: 'Carga Máxima Soportada',
      unit: 'W',
      value: getNumber(specs, 'wattage'),
      max: PSU_WATTAGE_MAX,
    },
  ];
}

export function getProductMetrics(product: ProductForMetrics): ProductMetric[] {
  const type = String(product?.type ?? '').toUpperCase();
  const specs = parseJsonRecord(product?.specs);
  const benchmarks = parseJsonRecord(product?.benchmarks);

  switch (type) {
    case 'CPU':
      return getCpuMetrics(benchmarks);
    case 'GPU':
      return getGpuMetrics(specs, benchmarks);
    case 'RAM':
      return getRamMetrics(specs);
    case 'STORAGE':
      return getStorageMetrics(specs);
    case 'MOTHERBOARD':
      return getMotherboardMetrics(specs);
    case 'PSU':
      return getPsuMetrics(specs);
    default:
      return [];
  }
}
