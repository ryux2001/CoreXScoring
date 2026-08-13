import { Build } from './types';
import { BUILD_SCORING_CONFIG } from './config';

/** Parse JSONB values while preserving the old fallback for malformed input. */
export const parseJson = (value: unknown): any => {
  if (typeof value !== 'string') return value || {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

/** Keep intermediate build notes in the same 0-10 range as before. */
export const clamp = (value: number, min = 0, max = 10): number =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export const safeNote = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return clamp(value);
};

/** Builds are displayed with one decimal place; this remains the final rounding boundary. */
export const round1 = (value: number): number => Math.round(clamp(value) * 10) / 10;

export const numberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const textValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const normalize = (value: unknown): string =>
  textValue(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const asArray = (value: unknown): any[] => {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string' && parsed.trim()) return [parsed];
  return [];
};

export const getSpecs = (product: Build | undefined): Build =>
  parseJson(product?.specs) || {};

export const getCompatibility = (product: Build | undefined): Build =>
  parseJson(product?.compatibility) || {};

export const getNote = (notes: Build | undefined, keys: string[]): number => {
  for (const key of keys) {
    const value = notes?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return safeNote(value);
  }
  return 0;
};

export const parseGeneration = (value: unknown): number | null => {
  const normalized = normalize(value);
  const match = normalized.match(/(?:pcie|gen|generation)[^0-9]*([345])/);
  if (match) return Number(match[1]);

  const direct = textValue(value).match(/\b([345])(?:\.0)?\b/);
  return direct ? Number(direct[1]) : null;
};

export const getHighestGeneration = (values: unknown[]): number | null => {
  const generations = values
    .map(parseGeneration)
    .filter((value): value is number => value !== null);
  return generations.length ? Math.max(...generations) : null;
};

export const getSocket = (product: Build | undefined): string => {
  const socket = getCompatibility(product).socket ?? product?.socket;
  return normalize(Array.isArray(socket) ? socket[0] : socket);
};

export const getRamType = (product: Build | undefined): string => {
  const specs = getSpecs(product);
  const compatibility = getCompatibility(product);
  return normalize(
    specs.type ??
      specs.technology ??
      compatibility.ram_type ??
      compatibility.technology,
  );
};

export const getRamCapacity = (product: Build | undefined): number => {
  const specs = getSpecs(product);
  return numberValue(specs.capacity_gb ?? specs.capacity, 0);
};

export const getRamFrequency = (product: Build | undefined): number => {
  const specs = getSpecs(product);
  const compatibility = getCompatibility(product);
  return numberValue(
    specs.frequency_mhz ?? specs.speed ?? compatibility.ram_frecuency,
    0,
  );
};

export const getMaxRamSupport = (product: Build | undefined): number =>
  numberValue(getCompatibility(product).ram_max_support, 0);

export const getMotherboardRamTypes = (motherboard: Build | undefined): string[] => {
  const compatibility = getCompatibility(motherboard);
  const explicitType = compatibility.ram_type;
  if (explicitType) return asArray(explicitType).map(normalize);

  return asArray(compatibility.ram_support)
    .map((value) => normalize(textValue(value).split('-')[0]));
};

export const getMotherboardMaxRamFrequency = (motherboard: Build | undefined): number => {
  const supported = asArray(getCompatibility(motherboard).ram_support);
  const frequencies = supported
    .map((value) => textValue(value).match(/(\d{4,})/)?.[1])
    .filter(Boolean)
    .map((value) => Number(value));

  return frequencies.length ? Math.max(...frequencies) : 0;
};

export const getPsuWatts = (psu: Build | undefined): number =>
  numberValue(getSpecs(psu).wattage ?? getSpecs(psu).watts, 0);

export const getEstimatedConsumption = (build: Build): number => {
  const cpuSpecs = getSpecs(build.cpu);
  const gpuSpecs = getSpecs(build.gpu);
  const storageSpecs = getSpecs(build.storage);

  return (
    numberValue(cpuSpecs.power_turbo_max ?? cpuSpecs.tdp, 0) +
    numberValue(gpuSpecs.tdp ?? gpuSpecs.power, 0) +
    numberValue(
      storageSpecs.power_w,
      BUILD_SCORING_CONFIG.POWER_ESTIMATION.STORAGE_DEFAULT_WATTS,
    ) +
    BUILD_SCORING_CONFIG.POWER_ESTIMATION.PLATFORM_WATTS +
    BUILD_SCORING_CONFIG.POWER_ESTIMATION.HEADROOM_WATTS
  );
};
