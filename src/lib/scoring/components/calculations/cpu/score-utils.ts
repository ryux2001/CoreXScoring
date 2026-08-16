import {
  CPU_SCORING_V3,
  type CpuArchitectureFamily,
} from './v3-config';

export type CpuRecord = Record<string, unknown>;

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return (value ?? fallback) as T;
}

export function parseJsonRecord(value: unknown): CpuRecord {
  const parsed = parseJson<unknown>(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as CpuRecord
    : {};
}

export function parseJsonArray(value: unknown): unknown[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function getFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Number.isFinite(value) ? value : 0));
}

export type CpuData = {
  benchmarks: CpuRecord;
  specs: CpuRecord;
  compatibility: CpuRecord;
  technologyNames: string[];
};

export function getCpuData(product: any): CpuData {
  const technologies = parseJsonArray(product?.technologies);

  return {
    benchmarks: parseJsonRecord(product?.benchmarks),
    specs: parseJsonRecord(product?.specs),
    compatibility: parseJsonRecord(product?.compatibility),
    technologyNames: technologies
      .filter((technology) => technology && typeof technology === 'object')
      .map((technology) => {
        const item = technology as { name?: unknown; description?: unknown };
        return `${String(item.name ?? '')} ${String(item.description ?? '')}`
          .trim()
          .toLowerCase();
      }),
  };
}

export function normalizeLog(value: number, low: number, high: number): number {
  if (!Number.isFinite(value) || value <= 0 || low <= 0 || high <= low) return 0;

  return clampScore(1 + 9 * (Math.log(value / low) / Math.log(high / low)));
}

export function normalizeCpuField(
  value: number,
  range: keyof typeof CPU_SCORING_V3.NORMALIZATION,
): number {
  const { low, high } = CPU_SCORING_V3.NORMALIZATION[range];
  return normalizeLog(value, low, high);
}

export type CpuScoreAnchor = readonly [value: number, score: number];

export function interpolateScore(
  value: number,
  anchors: readonly CpuScoreAnchor[],
): number {
  if (!Number.isFinite(value) || value <= 0 || anchors.length === 0) return 0;

  if (value <= anchors[0][0]) return anchors[0][1];

  for (let index = 1; index < anchors.length; index += 1) {
    const lower = anchors[index - 1];
    const upper = anchors[index];

    if (value <= upper[0]) {
      const progress = (value - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + (upper[1] - lower[1]) * progress;
    }
  }

  return anchors[anchors.length - 1][1];
}

export function getCpuArchitectureFamily(product: any): CpuArchitectureFamily {
  const { specs, technologyNames } = getCpuData(product);
  const architecture = String(specs.architecture ?? '').toUpperCase();
  const name = String(product?.name ?? '').toUpperCase();
  const technologyText = technologyNames.join(' ').toUpperCase();
  const isX3d = name.includes('X3D') || architecture.includes('X3D') || technologyText.includes('3D V-CACHE');

  if (architecture.includes('ZEN 5')) return isX3d ? 'zen5X3d' : 'zen5';
  if (architecture.includes('ZEN 4')) return isX3d ? 'zen4X3d' : 'zen4';
  if (architecture.includes('ZEN 3')) return isX3d ? 'zen3X3d' : 'zen3';
  if (architecture.includes('ARROW LAKE')) return 'arrowLake';
  if (architecture.includes('RAPTOR LAKE REFRESH')) return 'raptorRefresh';
  if (architecture.includes('RAPTOR LAKE')) return 'raptorLake';
  if (architecture.includes('ALDER LAKE')) return 'alderLake';

  return 'unknown';
}

export function getCpuArchitectureProfile(product: any) {
  return CPU_SCORING_V3.ARCHITECTURE[getCpuArchitectureFamily(product)];
}

export function getCpuPerformanceCores(product: any): number {
  const { specs } = getCpuData(product);
  const cores = getFiniteNumber(specs.cores) ?? 0;
  const efficiencyCores = getFiniteNumber(specs.efficency_cores) ?? 0;
  return Math.max(0, cores - efficiencyCores);
}

export function getCpuSocket(product: any): string {
  const { compatibility } = getCpuData(product);
  return String(compatibility.socket ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}
