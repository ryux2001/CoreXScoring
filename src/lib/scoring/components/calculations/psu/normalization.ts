/**
 * Shared PSU normalization.
 *
 * Supabase can return JSONB as parsed objects or serialized JSON strings.
 * This module also keeps connector presence distinct from an explicit zero:
 * zero means the connector is absent, while null means the inventory is
 * incomplete and must use the conservative fallback path.
 */

import { PSU_CONFIG } from '../../config/psu';

export type PsuRecord = Record<string, any>;

export interface PsuConnectorInventory {
  pcie6Plus2: number | null;
  pcie12Vhpwr: number | null;
  pcie12V2x6: number | null;
  eps8Pin: number | null;
  sata: number | null;
  molex: number | null;
  isComplete: boolean;
}

export function parseRecord(value: any): PsuRecord {
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

export function clamp(value: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function score10(value: number): number {
  return Math.round(clamp(value) * 10) / 10;
}

export function interpolate(
  value: number,
  anchors: ReadonlyArray<readonly [number, number]>,
): number {
  if (anchors.length === 0) return 0;
  if (!Number.isFinite(value)) return anchors[0][1];
  if (value <= anchors[0][0]) return anchors[0][1];

  for (let index = 1; index < anchors.length; index += 1) {
    const [rightX, rightY] = anchors[index];
    const [leftX, leftY] = anchors[index - 1];
    if (value <= rightX) {
      const range = rightX - leftX;
      return range > 0 ? leftY + ((rightY - leftY) * (value - leftX)) / range : rightY;
    }
  }

  return anchors[anchors.length - 1][1];
}

export function getSpecs(product: any): PsuRecord {
  return parseRecord(product?.specs);
}

export function getBenchmarks(product: any): PsuRecord {
  return parseRecord(product?.benchmarks);
}

export function getCompatibility(product: any): PsuRecord {
  return parseRecord(product?.compatibility);
}

export function getTechnologyText(product: any): string {
  return parseArray(product?.technologies)
    .map((technology) => {
      if (typeof technology === 'string') return technology;
      return `${technology?.name ?? ''} ${technology?.description ?? ''}`;
    })
    .join(' ')
    .toLowerCase();
}

export function getEvidenceText(product: any): string {
  return [
    getTechnologyText(product),
    parseArray(product?.tags).map(String).join(' ').toLowerCase(),
  ].join(' ');
}

export function getRippleScore(product: any): { score: number; hasData: boolean } {
  const raw = finiteNumber(getSpecs(product).ripple_mv, NaN);
  const hasData = Number.isFinite(raw) && raw > 0;
  return {
    score: hasData
      ? interpolate(raw, PSU_CONFIG.ESTABILIDAD.RIPPLE_ANCHORS)
      : PSU_CONFIG.ESTABILIDAD.MISSING_SCORE,
    hasData,
  };
}

export function getTopologyScore(product: any): number {
  const text = getTechnologyText(product);
  const hasLlc = /\bllc\b/.test(text);
  const hasDcToDc = /dc[-\s]?to[-\s]?dc|dc[-\s]?dc/.test(text);

  if (hasLlc && hasDcToDc) return PSU_CONFIG.ESTABILIDAD.TOPOLOGIA.LLC_DC;
  if (hasLlc || hasDcToDc) return PSU_CONFIG.ESTABILIDAD.TOPOLOGIA.SINGLE;
  return PSU_CONFIG.ESTABILIDAD.TOPOLOGIA.UNKNOWN;
}

function getCount(record: PsuRecord, key: string): number | null {
  const value = finiteNumber(record[key], NaN);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

export function getConnectorInventory(product: any): PsuConnectorInventory {
  const connectors = parseRecord(getSpecs(product).connectors);
  const inventory = {
    pcie6Plus2: getCount(connectors, 'pcie_6plus2'),
    pcie12Vhpwr: getCount(connectors, 'pcie_12vhpwr'),
    pcie12V2x6: getCount(connectors, 'pcie_12v2x6'),
    eps8Pin: getCount(connectors, 'eps_8pin'),
    sata: getCount(connectors, 'sata'),
    molex: getCount(connectors, 'molex'),
  };

  return {
    ...inventory,
    isComplete: Object.values(inventory).every((value) => value !== null),
  };
}

export function getModularityScore(product: any): number {
  const value = String(getSpecs(product).modular_type ?? '').toLowerCase();
  if (value.includes('full')) return PSU_CONFIG.CONECTIVIDAD.MODULARITY.FULL;
  if (value.includes('semi')) return PSU_CONFIG.CONECTIVIDAD.MODULARITY.SEMI;
  return PSU_CONFIG.CONECTIVIDAD.MODULARITY.NON;
}

export function getAtxFallbackScore(product: any): number {
  const formFactor = String(getCompatibility(product).form_factor ?? '').toLowerCase();
  if (/atx\s*3\.1/.test(formFactor)) return PSU_CONFIG.CONECTIVIDAD.ATX_FALLBACK.ATX3_1;
  if (/atx\s*3\.0/.test(formFactor)) return PSU_CONFIG.CONECTIVIDAD.ATX_FALLBACK.ATX3_0;
  return PSU_CONFIG.CONECTIVIDAD.ATX_FALLBACK.LEGACY;
}

export function getPrice(evaluatedPrice: any, fallbackPrice?: any): number | null {
  const selected = finiteNumber(evaluatedPrice, NaN);
  if (Number.isFinite(selected) && selected > 0) return selected;

  const fallback = finiteNumber(fallbackPrice, NaN);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}
