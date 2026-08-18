/**
 * Shared, defensive normalization for storage scoring.
 *
 * Product JSONB values come from Supabase in more than one shape (objects,
 * JSON strings and, occasionally, null). Keeping the parsing and feature
 * detection here prevents each note from silently using a different fallback.
 */

import { STORAGE_CONFIG } from '../../config/storage';

export type StorageRecord = Record<string, any>;

export function parseRecord(value: any): StorageRecord {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function parseArray(value: any): any[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value : [];
}

/** Accepts both JSON numbers and legacy strings with a comma decimal mark. */
export function finiteNumber(value: any, fallback = NaN): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  const normalized = /^[-+]?\d{1,3}(?:,\d{3})+$/.test(trimmed)
    ? trimmed.replace(/,/g, '')
    : trimmed.replace(',', '.');
  const match = normalized.match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return fallback;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function score10(value: number): number {
  return Math.round(Math.max(0, Math.min(10, Number.isFinite(value) ? value : 0)) * 10) / 10;
}

export function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

/** Linear interpolation over ascending anchors, clamped at both ends. */
export function interpolate(value: number, anchors: ReadonlyArray<readonly [number, number]>): number {
  if (!Number.isFinite(value) || anchors.length === 0) return anchors[0]?.[1] ?? 0;
  if (value <= anchors[0][0]) return anchors[0][1];

  for (let index = 1; index < anchors.length; index += 1) {
    const [rightX, rightY] = anchors[index];
    const [leftX, leftY] = anchors[index - 1];
    if (value <= rightX) {
      const range = rightX - leftX;
      if (range <= 0) return rightY;
      const position = (value - leftX) / range;
      return leftY + (rightY - leftY) * position;
    }
  }

  return anchors[anchors.length - 1][1];
}

export function getSpecs(product: any): StorageRecord {
  return parseRecord(product?.specs);
}

export function getCompatibility(product: any): StorageRecord {
  return parseRecord(product?.compatibility);
}

export function getBenchmarks(product: any): StorageRecord {
  return parseRecord(product?.benchmarks);
}

export function getTechnologyText(product: any): string {
  const technologies = parseArray(product?.technologies);
  return technologies
    .map((technology) => {
      if (typeof technology === 'string') return technology;
      return `${technology?.name ?? ''} ${technology?.description ?? ''}`;
    })
    .join(' ')
    .toLowerCase();
}

export function getStorageSpeeds(product: any): { read: number; write: number } {
  const specs = getSpecs(product);
  const benchmarks = getBenchmarks(product);
  const specRead = finiteNumber(specs.read_speed, 0);
  const specWrite = finiteNumber(specs.write_speed, 0);
  const benchmarkRead = finiteNumber(benchmarks.crystal_disk_read, 0);
  const benchmarkWrite = finiteNumber(benchmarks.crystal_disk_write, 0);

  return {
    read: Math.max(0, benchmarkRead > 0 ? benchmarkRead : specRead),
    write: Math.max(0, benchmarkWrite > 0 ? benchmarkWrite : specWrite),
  };
}

export function getCapacityGb(product: any): number {
  const rawCapacity = getSpecs(product).capacity;
  const capacityText = String(rawCapacity ?? '').toLowerCase();
  const capacity = finiteNumber(rawCapacity, 0);
  if (capacityText.includes('tb')) return Math.max(0, capacity * 1000);
  return Math.max(0, capacity);
}

export function getTbw(product: any): number {
  return Math.max(0, finiteNumber(getSpecs(product).tbw, 0));
}

export function getNandScore(product: any): number {
  const nand = String(getSpecs(product).nand_type ?? '').toLowerCase();
  if (nand.includes('qlc')) return 0.42;
  if (nand.includes('slc')) return 0.95;
  if (nand.includes('mlc') && nand.includes('tlc')) return 0.86;
  if (nand.includes('mlc')) return 0.9;
  if (nand.includes('tlc')) return 0.82;
  if (nand.includes('3d nand') || nand.includes('3d')) return 0.64;
  return 0.55;
}

export function getPcieScore(product: any): number {
  const compatibility = getCompatibility(product);
  const specs = getSpecs(product);
  const text = `${compatibility.pcie_generation ?? ''} ${specs.interface ?? ''}`.toLowerCase();
  const explicitGeneration = finiteNumber(compatibility.pcie_generation, NaN);
  const interfaceGeneration = finiteNumber(
    text.match(/pcie\s*(?:gen(?:eration)?\s*)?([345](?:\.0)?)/)?.[1],
    0,
  );
  const generation = Math.max(
    Number.isFinite(explicitGeneration) ? explicitGeneration : 0,
    interfaceGeneration,
  );
  const category = String(product?.category ?? '').toLowerCase();

  if (category.includes('sata') || (!generation && text.includes('sata'))) return 0.35;
  if (generation >= 5) return 1;
  if (generation >= 4) return 0.78;
  if (generation >= 3) return 0.58;
  return category.includes('nvme') ? 0.62 : 0.35;
}

export function getProtocolScore(product: any): number {
  const specs = getSpecs(product);
  const protocol = String(specs.protocol ?? '').toLowerCase();
  const category = String(product?.category ?? '').toLowerCase();
  if (category.includes('sata') || protocol.includes('sata')) return 0.35;
  if (protocol.includes('nvme 2')) return 0.95;
  if (protocol.includes('nvme 1.4')) return 0.82;
  if (protocol.includes('nvme 1.3')) return 0.76;
  if (protocol.includes('nvme')) return 0.8;
  return category.includes('nvme') ? 0.72 : 0.35;
}

export interface StorageSignals {
  dram: boolean;
  hmb: boolean;
  slcCache: boolean;
  integrityHits: number;
  thermalFeature: number;
  powerFeature: number;
}

export function getStorageSignals(product: any): StorageSignals {
  const specs = getSpecs(product);
  const text = getTechnologyText(product);
  const dramLess = includesAny(text, ['dram-less', 'dramless', 'without dram', 'sin dram']);
  const explicitDram = specs.dram_cache;
  const explicitDramValue = typeof explicitDram === 'boolean'
    ? explicitDram
    : typeof explicitDram === 'string' && /^(true|false)$/i.test(explicitDram)
      ? explicitDram.toLowerCase() === 'true'
      : undefined;

  const dram = explicitDramValue !== undefined
    ? explicitDramValue
    : !dramLess && includesAny(text, ['dram cache', 'dram-cache', 'dram buffer', 'sram cache']);
  const hmb = includesAny(text, ['host memory buffer', ' hmb', 'hmb ']);
  const slcCache = !dram && includesAny(text, ['slc cach', 'slc buffer', 'turbowrite', 'ncache']);

  const integrityTerms = [
    'ecc',
    'ldpc',
    'error correction',
    'hardware encryption',
    'power loss',
    'pyrite',
    'tcg ',
  ];
  const integrityHits = integrityTerms.filter((term) => text.includes(term)).length;

  const thermalFeature = includesAny(text, [
    'dynamic thermal',
    'adaptive thermal',
    'thermal management',
    'thermal guard',
    'heatsink',
    'heat spreader',
    'heatspreader',
    'nickel-coated',
  ]) ? (includesAny(text, ['heatsink', 'heat spreader', 'heatspreader', 'nickel-coated']) ? 0.72 : 0.9) : 0.3;

  const powerFeature = includesAny(text, ['low power', 'low-power', 'modern standby', 'power efficient']) ? 0.9 : 0.5;

  return { dram, hmb, slcCache, integrityHits, thermalFeature, powerFeature };
}

export interface EnergyMetric {
  value: number;
  estimated: boolean;
  legacyScale: boolean;
}

/**
 * The database currently contains two generations of this field: legacy
 * 0–1 values and the newer 2.45–10.1 values from the energy_per_gb update.
 * Legacy values are promoted by 10x so both ranges are comparable while the
 * remaining rows are migrated. Missing data receives a conservative estimate.
 */
export function getEnergyMetric(product: any): EnergyMetric {
  const specs = getSpecs(product);
  const raw = finiteNumber(specs.energy_per_gb, NaN);
  if (Number.isFinite(raw) && raw > 0) {
    const legacyScale = raw <= 1.5;
    return {
      value: legacyScale ? raw * STORAGE_CONFIG.EFICIENCIA.LEGACY_SCALE_FACTOR : raw,
      estimated: false,
      legacyScale,
    };
  }

  const pcie = getPcieScore(product);
  const estimatedValue = pcie >= 0.95 ? 8.8 : pcie >= 0.75 ? 7.2 : pcie >= 0.55 ? 6.4 : 5.4;
  return { value: estimatedValue, estimated: true, legacyScale: false };
}

export function getPrice(evaluatedPrice: number): number | null {
  const price = finiteNumber(evaluatedPrice, NaN);
  return Number.isFinite(price) && price > 0 ? price : null;
}
