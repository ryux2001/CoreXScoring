/**
 * CPU scoring v3 configuration.
 *
 * The references are deliberately fixed so scores remain stable when the
 * catalogue grows from the calibration sample to the full database.
 */

export type CpuArchitectureFamily =
  | 'zen3'
  | 'zen3X3d'
  | 'zen4'
  | 'zen4X3d'
  | 'zen5'
  | 'zen5X3d'
  | 'alderLake'
  | 'raptorLake'
  | 'raptorRefresh'
  | 'arrowLake'
  | 'unknown';

export type CpuArchitectureProfile = {
  ipc: number;
  gaming: number;
};

export const CPU_SCORING_V3 = {
  VERSION: 1,
  NORMALIZATION: {
    GEEKBENCH_SINGLE: { low: 1500, high: 3300 },
    CINEBENCH_MULTI: { low: 8000, high: 45000 },
    PASSMARK: { low: 12000, high: 72000 },
    TURBO: { low: 4, high: 6.2 },
    CINEBENCH_PER_WATT: { low: 80, high: 280 },
    PASSMARK_PER_WATT: { low: 130, high: 440 },
  },
  ARCHITECTURE: {
    zen3: { ipc: 5.5, gaming: 5.8 },
    zen3X3d: { ipc: 5.5, gaming: 8.5 },
    zen4: { ipc: 7.5, gaming: 7.8 },
    zen4X3d: { ipc: 7.5, gaming: 10 },
    zen5: { ipc: 9.2, gaming: 9.2 },
    zen5X3d: { ipc: 9.2, gaming: 10 },
    alderLake: { ipc: 6.7, gaming: 6.8 },
    raptorLake: { ipc: 8.2, gaming: 8.2 },
    raptorRefresh: { ipc: 8.5, gaming: 8.5 },
    arrowLake: { ipc: 9, gaming: 8.8 },
    unknown: { ipc: 0, gaming: 0 },
  } satisfies Record<CpuArchitectureFamily, CpuArchitectureProfile>,
  CACHE_ANCHORS: [
    [12, 3],
    [16, 4],
    [20, 5],
    [24, 5.5],
    [32, 6.5],
    [36, 7],
    [64, 8.5],
    [96, 10],
    [128, 10],
  ] as const,
  PERFORMANCE_CORE_ANCHORS: [
    [4, 6],
    [6, 10],
    [8, 10],
  ] as const,
  POWER_FOOTPRINT_ANCHORS: [
    [65, 10],
    [76, 9.6],
    [88, 9],
    [117, 7.5],
    [142, 6],
    [162, 5],
    [181, 4.2],
    [230, 2.5],
    [253, 2],
  ] as const,
  PLATFORM: {
    SOCKET_SCORES: {
      AM4: 5,
      AM5: 10,
      'LGA 1700': 7,
      'LGA 1851': 8.5,
    } as Record<string, number>,
    RAM_TYPE_SCORES: {
      DDR4: 4,
      DDR5: 9,
      'DDR4/DDR5': 9.5,
    } as Record<string, number>,
    PCIE_SCORES: {
      3: 3,
      4: 7,
      5: 10,
    } as Record<number, number>,
    RAM_SPEED_ANCHORS: [
      [3200, 4],
      [4800, 7],
      [5200, 8],
      [5600, 9],
      [6400, 10],
    ] as const,
    MAX_RAM_ANCHORS: [
      [128, 6],
      [192, 8],
      [256, 10],
    ] as const,
  },
} as const;
