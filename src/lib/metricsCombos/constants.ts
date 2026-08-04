export const METRIC_CEILINGS = {
  CPU: {
    GEEKBENCH_SINGLE: 3500,
    CINEBENCH_MULTI: 45000,
    PASSMARK: 70000,
  },
  GPU: {
    BLENDER: 16000,
    TIME_SPY: 40000,
    PORT_ROYAL: 30000,
    VRAM_GB: 24,
  },
};

export const METRIC_WEIGHTS = {
  CPU: {
    CINEBENCH: 0.40,
    GEEKBENCH: 0.35,
    PASSMARK: 0.25,
  },
  GPU: {
    BLENDER: 0.35,
    TIME_SPY: 0.30,
    VRAM: 0.20,
    PORT_ROYAL: 0.15,
  },
};