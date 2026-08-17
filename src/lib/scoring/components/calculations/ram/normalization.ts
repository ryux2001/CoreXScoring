import { formatNoteScore } from '../../../shared/helpers';

type JsonRecord = Record<string, any>;

export type RamFeatures = {
  technology: string;
  generation: number;
  speedMt: number;
  cas: number;
  casLatencyNs: number;
  capacityGb: number;
  moduleCount: number;
  channelScore: number;
  hasXmp: boolean;
  hasExpo: boolean;
  profileScore: number;
  hasPmic: boolean;
  hasOnDieEcc: boolean;
  hasDedicatedEcc: boolean;
  hasValidatedCompatibility: boolean;
  overclockingScore: number;
  platformScore: number;
  hasValidTechnicalData: boolean;
};

const asRecord = (value: unknown): JsonRecord => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as JsonRecord
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const asArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const finiteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const getText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => getText(item)).join(' ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
};

const getTechnicalText = (product: any, specs: JsonRecord): string => {
  const productTechnologies = asArray(product?.technologies);
  const technologies = productTechnologies.length > 0
    ? productTechnologies
    : asArray(specs.technologies);
  const technologyText = technologies
    .map((technology) => {
      if (typeof technology === 'string') return technology;
      if (technology && typeof technology === 'object') {
        return `${getText(technology.name)} ${getText(technology.description)}`;
      }
      return '';
    })
    .join(' ');

  return `${technologyText} ${getText(specs.technology)} ${getText(specs.profile_support)} ${getText(product?.profile_support)}`.toLowerCase();
};

const parseCas = (value: unknown): number => {
  const text = getText(value);
  const match = text.match(/(?:cl|cas)?\s*(\d+(?:\.\d+)?)/i);
  const parsed = match ? Number(match[1]) : finiteNumber(value);
  return parsed && parsed > 0 ? parsed : 0;
};

const parseChannelCount = (value: unknown): number => {
  const text = getText(value);
  const match = text.match(/(\d+)\s*[x×]/i);
  if (match) return Math.max(1, Math.min(2, Number(match[1])));

  if (value === true) return 2;
  const parsed = finiteNumber(value);
  return parsed && parsed > 1 ? 2 : 1;
};

const getGeneration = (technology: string): number => {
  const match = technology.match(/DDR\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
};

const getProfileScore = (hasXmp: boolean, hasExpo: boolean, text: string): number => {
  let score = hasXmp && hasExpo ? 1 : (hasXmp || hasExpo ? 0.72 : 0.35);
  if (/(?:xmp\s*3|expo\s*2)/i.test(text)) score += 0.05;
  return clamp01(score);
};

const getOverclockingScore = (specs: JsonRecord, text: string): number => {
  const value = `${getText(specs.overclocking_headroom)} ${text}`.toLowerCase();
  if (value.includes('high') || value.includes('alto')) return 1;
  if (value.includes('medium') || value.includes('medio')) return 0.72;
  if (value.includes('low') || value.includes('bajo')) return 0.45;
  return 0.55;
};

export const normalizeRamProduct = (product: any): RamFeatures => {
  const specs = asRecord(product?.specs);
  const technology = getText(specs.technology || specs.memory_type).toUpperCase();
  const generation = getGeneration(technology);
  const speedMt = finiteNumber(specs.speed) ?? 0;
  const cas = parseCas(specs.cas_latency ?? specs.latency);
  const capacityGb = finiteNumber(specs.capacity) ?? 0;
  const moduleCount = parseChannelCount(specs.dual_channel ?? specs.module_count);
  const channelScore = moduleCount >= 2 ? 1 : 0.76;
  const technicalText = getTechnicalText(product, specs);
  const hasXmp = /\bxmp\b/i.test(technicalText);
  const hasExpo = /\bexpo\b/i.test(technicalText);
  const hasPmic = /\bpmic\b|power management integrated circuit/i.test(technicalText);
  const hasOnDieEcc = /on[- ]die\s+ecc/i.test(technicalText);
  const hasDedicatedEcc = specs.ecc_support === true || specs.ecc === true ||
    specs.ecc_support === 'true' || specs.ecc === 'true' ||
    /\b(?:registered|buffered)\s+ecc\b/i.test(technicalText);
  const hasValidatedCompatibility = /compatib|validation|tested|intel\s*(?:&|and)\s*amd/i.test(technicalText);
  const profileScore = getProfileScore(hasXmp, hasExpo, technicalText);
  const overclockingScore = getOverclockingScore(specs, technicalText);
  const platformScore = clamp01(
    (generation >= 5 ? 1 : generation === 4 ? 0.62 : 0.4) * 0.45 +
    profileScore * 0.3 +
    (hasPmic || hasOnDieEcc || hasDedicatedEcc ? 1 : 0.35) * 0.15 +
    overclockingScore * 0.1
  );

  const casLatencyNs = speedMt > 0 && cas > 0 ? (2000 * cas) / speedMt : 0;

  return {
    technology,
    generation,
    speedMt,
    cas,
    casLatencyNs,
    capacityGb,
    moduleCount,
    channelScore,
    hasXmp,
    hasExpo,
    profileScore,
    hasPmic,
    hasOnDieEcc,
    hasDedicatedEcc,
    hasValidatedCompatibility,
    overclockingScore,
    platformScore,
    hasValidTechnicalData: speedMt > 0 && cas > 0 && capacityGb > 0,
  };
};

export const score10 = (value: number): number => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return formatNoteScore(Number((safeValue).toFixed(1)));
};

export const normalizeRange = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value) || max <= min) return 0;
  return clamp01((value - min) / (max - min));
};

export const inverseNormalizeRange = (value: number, best: number, worst: number): number => {
  return 1 - normalizeRange(value, best, worst);
};

export const getEffectiveBandwidth = (features: RamFeatures): number => {
  if (features.speedMt <= 0) return 0;
  return (features.speedMt * Math.max(1, features.moduleCount) * 8) / 1000;
};

export const getCapacityScore = (capacityGb: number): number => {
  const anchors = [
    [8, 4],
    [16, 5.8],
    [32, 7.5],
    [64, 9],
    [96, 10],
  ] as const;

  if (!Number.isFinite(capacityGb) || capacityGb <= 0) return 0;
  if (capacityGb <= anchors[0][0]) {
    return Math.max(0, anchors[0][1] * (capacityGb / anchors[0][0]));
  }

  for (let index = 1; index < anchors.length; index += 1) {
    const [upperCapacity, upperScore] = anchors[index];
    const [lowerCapacity, lowerScore] = anchors[index - 1];
    if (capacityGb <= upperCapacity) {
      const ratio = (capacityGb - lowerCapacity) / (upperCapacity - lowerCapacity);
      return lowerScore + (upperScore - lowerScore) * ratio;
    }
  }

  return 10;
};

export const getPrice = (evaluatedPrice: number): number | null => {
  if (!Number.isFinite(evaluatedPrice) || evaluatedPrice <= 0) return null;
  return Math.min(evaluatedPrice, 5000);
};
