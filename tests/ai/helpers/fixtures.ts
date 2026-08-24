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

export const ownBuildFixture = {
  id: "build-owned-1",
  title: "Mi build 1440p",
  user_id: "user-1",
};
