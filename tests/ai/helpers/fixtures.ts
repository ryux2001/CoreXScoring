export const cpuFixture = {
  id: "cpu-7800x3d",
  slug: "amd-ryzen-7-7800x3d",
  name: "AMD Ryzen 7 7800X3D",
  brand: "AMD",
  type: "cpu",
  category: "Gaming",
  price_base_usd: 399,
  price_base_eur: 379,
  specs: { socket: "AM5", cores: 8, threads: 16 },
  compatibility: { socket: "AM5" },
  benchmarks: { cinebench_multi: 18000 },
  technologies: ["3D V-Cache"],
  tags: ["gaming"],
};

export const gpuFixture = {
  id: "gpu-5070-ti",
  slug: "nvidia-geforce-rtx-5070-ti",
  name: "NVIDIA GeForce RTX 5070 Ti",
  brand: "NVIDIA",
  type: "gpu",
  category: "Gaming",
  price_base_usd: 749,
  price_base_eur: 699,
  specs: { vram_capacity: 16, vram_type: "GDDR7" },
  compatibility: { pcie_generation: "5.0" },
  benchmarks: { "1440p_gaming_avg_fps": 140 },
  technologies: ["DLSS"],
  tags: ["gaming", "ray tracing"],
};

export const gameFixture = {
  id: "game-cyberpunk-2077",
  slug: "cyberpunk-2077",
  name: "Cyberpunk 2077",
  limite_motor_fps: 180,
  cpu_score_ideal: 8_000,
  ram_minima_gb: 16,
  vram_minima_gb: 8,
  gpu_fps_base: {
    [gpuFixture.id]: {
      "1080p": { bajo: 150, medio: 130, alto: 110, ultra: 95 },
      "1440p": { bajo: 115, medio: 100, alto: 85, ultra: 72 },
      "4k": { bajo: 75, medio: 62, alto: 52, ultra: 44 },
    },
  },
};

export const ownBuildFixture = {
  id: "build-owned-1",
  title: "Mi build 1440p",
  user_id: "user-1",
};
