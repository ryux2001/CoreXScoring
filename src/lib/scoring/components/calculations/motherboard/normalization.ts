/**
 * Shared normalization for motherboard scoring.
 *
 * Motherboard JSONB fields contain counted slot strings ("4x ..."), vendor
 * synonyms and, depending on the caller, either parsed objects or JSON text.
 * Every note uses these helpers so a missing field is handled consistently.
 */

export type MotherboardRecord = Record<string, any>;

export function parseRecord(value: any): MotherboardRecord {
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

export function getCompatibility(product: any): MotherboardRecord {
  return parseRecord(product?.compatibility);
}

export function getSpecs(product: any): MotherboardRecord {
  return parseRecord(product?.specs);
}

export function getBenchmarks(product: any): MotherboardRecord {
  return parseRecord(product?.benchmarks);
}

export function getTechnologies(product: any): any[] {
  return parseArray(product?.technologies);
}

export function getTechnologyText(product: any): string {
  const specs = getSpecs(product);
  const bios = parseArray(specs.bios_features);
  const technologies = getTechnologies(product);
  const technologyText = technologies.map((technology) => {
    if (typeof technology === 'string') return technology;
    return `${technology?.name ?? ''} ${technology?.description ?? ''}`;
  });

  return [...technologyText, ...bios.map(String)].join(' ').toLowerCase();
}

export function expandCountedSlots(value: any): string[] {
  return parseArray(value).flatMap((slot) => {
    const text = String(slot ?? '').trim().toLowerCase();
    const count = finiteNumber(text.match(/^([0-9]+)\s*x/)?.[1], 1);
    return Array.from({ length: Math.max(1, Math.floor(count)) }, () => text);
  });
}

export function getPcieGeneration(value: any): number {
  if (typeof value === 'number') return finiteNumber(value, 0);
  const text = String(value ?? '');
  const pcieMatch = text.match(/pcie\s*(?:gen(?:eration)?\s*)?([345](?:\.0)?)/i);
  if (pcieMatch) return finiteNumber(pcieMatch[1], 0);
  return finiteNumber(text, 0);
}

export function getSlotGeneration(slot: string): number {
  return getPcieGeneration(slot);
}

export function getSlotLaneWidth(slot: string, primary = false): number {
  // A counted x16 slot with "x16 or x8/x8" exposes x8 when used as the
  // secondary slot in a multi-GPU configuration.
  if (!primary && /\(\s*x16\s+or\s+x8\/x8/i.test(slot)) return 8;
  if (!primary && /\(\s*x4\s*\)/i.test(slot)) return 4;
  return finiteNumber(slot.match(/x(16|8|4|1)\b/i)?.[1], 0);
}

export function getPrimaryPcieIndex(slots: string[]): number {
  return slots.findIndex((slot) => /x16\b/i.test(slot) && !/\(\s*x4\s*\)/i.test(slot));
}

export function getPcieSlots(product: any): string[] {
  return expandCountedSlots(getSpecs(product).pcie_slots);
}

export function getM2Slots(product: any): string[] {
  return expandCountedSlots(getSpecs(product).m2_slots);
}

export function getMaxRamSpeed(product: any): number {
  return Math.max(
    0,
    ...parseArray(getCompatibility(product).ram_support)
      .map((entry) => finiteNumber(String(entry).match(/(\d{4,})/)?.[1], 0)),
  );
}

export function getRamGeneration(product: any): 'DDR5' | 'DDR4' | 'DDR3' | 'UNKNOWN' {
  const ramText = parseArray(getCompatibility(product).ram_support).join(' ').toUpperCase();
  if (ramText.includes('DDR5')) return 'DDR5';
  if (ramText.includes('DDR4')) return 'DDR4';
  if (ramText.includes('DDR3')) return 'DDR3';
  return 'UNKNOWN';
}

export function getSocket(product: any): string {
  const socket = parseArray(getCompatibility(product).socket).join(' ').toLowerCase().replace(/\s+/g, '');
  if (socket.includes('am5')) return 'AM5';
  if (socket.includes('1851')) return 'LGA1851';
  if (socket.includes('1700')) return 'LGA1700';
  if (socket.includes('am4')) return 'AM4';
  return 'UNKNOWN';
}

export function getUsbCounts(product: any): { usb2: number; usb3: number; usbC: number } {
  const usb = parseRecord(getSpecs(product).usb_ports);
  return {
    usb2: Math.max(0, finiteNumber(usb.usb_2, 0)),
    usb3: Math.max(0, finiteNumber(usb.usb_3, 0)),
    usbC: Math.max(0, finiteNumber(usb.usb_c, 0)),
  };
}

export function getThermalScore(product: any): number {
  const thermal = String(getBenchmarks(product).vrm_thermal_performance ?? '').toLowerCase();
  return ({
    acceptable: 5,
    average: 6,
    good: 7,
    'very good': 7.8,
    great: 8.2,
    excellent: 8.8,
    outstanding: 9.4,
    exceptional: 10,
  } as Record<string, number>)[thermal] ?? 6;
}

export function getAudioScore(product: any): number {
  const audio = String(getSpecs(product).audio_codec ?? '').toLowerCase();
  if (audio.includes('sabre') || audio.includes('ess')) return 10;
  if (audio.includes('alc4082') || audio.includes('alc4080')) return 9.2;
  if (audio.includes('s1220') || audio.includes('alc1220')) return 8.6;
  if (audio.includes('alc1200')) return 7.2;
  if (audio.includes('alc897') || audio.includes('alc892') || audio.includes('alc887')) return 4.5;
  return 5;
}

export function getPrice(evaluatedPrice: number): number | null {
  const price = finiteNumber(evaluatedPrice, NaN);
  return Number.isFinite(price) && price > 0 ? price : null;
}
