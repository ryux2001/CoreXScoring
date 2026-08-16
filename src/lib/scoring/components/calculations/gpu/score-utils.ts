import {
  type GpuArchitectureFamily,
  GPU_SCORING_V3,
} from './v3-config';

export type ScoreAnchor = readonly [value: number, score: number];
export type GpuRecord = Record<string, unknown>;

export function parseJsonb<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return (value ?? fallback) as T;
}

export function parseJsonRecord(value: unknown): GpuRecord {
  const parsed = parseJsonb<unknown>(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as GpuRecord
    : {};
}

export function getGpuData(product: any): {
  benchmarks: GpuRecord;
  specs: GpuRecord;
  features: GpuRecord;
} {
  const specs = parseJsonRecord(product?.specs);
  const productFeatures = parseJsonRecord(product?.features);
  const specFeatures = parseJsonRecord(specs.features);

  return {
    benchmarks: parseJsonRecord(product?.benchmarks),
    specs,
    features: { ...specFeatures, ...productFeatures },
  };
}

export function getFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

export function getFeatureScore(features: GpuRecord, key: string): number | null {
  const value = getFiniteNumber(features[key]);
  if (value === null) return null;
  return clampScore(value);
}

export function hasFeature(features: GpuRecord, key: string): boolean {
  const value = features[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized !== '' && !['0', 'false', 'no', 'none', 'unsupported'].includes(normalized);
  }

  return value !== null && value !== undefined;
}

export function interpolateScore(value: number, anchors: readonly ScoreAnchor[]): number {
  if (!Number.isFinite(value) || value <= 0 || anchors.length === 0) return 0;

  const first = anchors[0];
  const last = anchors[anchors.length - 1];

  if (value <= first[0]) return first[1];
  if (value >= last[0]) return last[1];

  for (let index = 1; index < anchors.length; index += 1) {
    const lower = anchors[index - 1];
    const upper = anchors[index];

    if (value <= upper[0]) {
      const progress = (value - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + (upper[1] - lower[1]) * progress;
    }
  }

  return last[1];
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(10, value));
}

/**
 * Logarithmic 0-10 normalization used by GPU scoring v3.
 * Fixed references keep scores stable when the catalogue changes.
 */
export function normalizeGpuScore(value: number, low: number, high: number): number {
  if (!Number.isFinite(value) || value <= 0 || low <= 0 || high <= low) return 0;

  return clampScore(1 + 9 * (Math.log(value / low) / Math.log(high / low)));
}

export function normalizeGpuScoreFromConfig(
  value: number,
  range: keyof typeof GPU_SCORING_V3.NORMALIZATION,
): number {
  const { low, high } = GPU_SCORING_V3.NORMALIZATION[range];
  return normalizeGpuScore(value, low, high);
}

export function getGpuArchitectureFamily(product: any): GpuArchitectureFamily {
  const { specs } = getGpuData(product);
  const architecture = String(specs.architecture ?? '').toUpperCase();
  const name = String(product?.name ?? '').toUpperCase();

  if (architecture.includes('BLACKWELL') || name.includes('RTX 50')) return 'blackwell';
  if (architecture.includes('ADA') || architecture.includes('LOVELACE')) return 'ada';
  if (architecture.includes('AMPERE')) return 'ampere';
  if (architecture.includes('RDNA 4') || architecture.includes('RDNA4')) return 'rdna4';
  if (architecture.includes('RDNA 3') || architecture.includes('RDNA3')) return 'rdna3';
  if (architecture.includes('RDNA 2') || architecture.includes('RDNA2')) return 'rdna2';
  if (architecture.includes('XE2') || architecture.includes('BATTLEMAGE')) return 'xe2';

  return 'unknown';
}

export function getGpuVramCapacityScore(value: number): number {
  return interpolateScore(value, GPU_SCORING_V3.VRAM_ANCHORS);
}

export function getGpuTechnologyText(technologies: unknown, description = ''): string {
  const parsed = parseJsonb<unknown[]>(technologies, []);
  const technologyText = Array.isArray(parsed)
    ? parsed
      .map((technology) => {
        if (!technology || typeof technology !== 'object') return '';
        const item = technology as { name?: unknown; description?: unknown };
        return `${String(item.name ?? '')} ${String(item.description ?? '')}`;
      })
      .join(' ')
    : '';

  return `${technologyText} ${description}`.trim();
}

export function getGpuFeatureText(features: GpuRecord): string {
  return Object.entries(features)
    .filter(([, value]) => {
      if (value === false || value === null || value === undefined) return false;
      if (typeof value === 'number' && value <= 0) return false;
      if (typeof value === 'string' && ['0', 'false', 'no', 'none', 'unsupported'].includes(value.trim().toLowerCase())) return false;
      return true;
    })
    .map(([key, value]) => `${key} ${String(value)}`)
    .join(' ');
}
