export interface GameGpuPresets {
  [preset: string]: number; // Ej: { "bajo": 180, "medio": 140, "ultra": 95 }
}

export interface GameGpuResolutions {
  "1080p"?: GameGpuPresets;
  "1440p"?: GameGpuPresets;
  "4k"?: GameGpuPresets;
}

export interface GameData {
  id: string;
  slug: string;
  name: string;
  limite_motor_fps: number;
  cpu_score_ideal: number;
  ram_minima_gb: number;
  vram_minima_gb: number;
  gpu_fps_base: Record<string, GameGpuResolutions>;
}

export interface FpsResult {
  fhd: number; // 1080p
  qhd: number; // 1440p
  uhd: number; // 4K
}