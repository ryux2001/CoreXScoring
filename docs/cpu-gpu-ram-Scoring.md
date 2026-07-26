# CPU · GPU · RAM — Sistema de Scoring

## Arquitectura General

Cada componente se evalúa en **5 categorías técnicas** + **Calidad/Precio**, todas en escala **0-10**:

```
┌────────────────────────────────────────────┐
│ CPU / GPU / RAM → 5 notas técnicas        │
│  ├─ Potencia / Velocidad                  │
│  ├─ Tecnologías                            │
│  ├─ Productividad                         │
│  ├─ Juegos                                 │
│  └─ Eficiencia                             │
│  └→ Calidad/Precio ( ponderada + precio) │
└────────────────────────────────────────────┘
```

---

## 🖥️ CPU — 5 Notas Técnicas

### 1. POTENCIA (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| **Cinebench** (Multi-core) | 3500 pts | 50,000 | `(val / 50000) × 3500` |
| **Geekbench** (Single-core) | 2100 pts | 3,600 | `(val / 3600) × 2100` |
| **Passmark** | 1400 pts | 80,000 | `(val / 80000) × 1400` |
| **Turbo Frequency** | 1200 pts | 6.2 GHz | `(val / 6.2) × 1200` |
| **Hilos** | 900 pts | 32 | `(val / 32) × 900` |
| **Cache L3** | 900 pts | 150 MB | `(val / 150) × 900` |

**Notas técnicas:**
- **IA**: NPU, AVX-512, Ryzen AI (+500 pts)
- **Multithreading**: Hyper-threading/SMT (+500 pts)
- **Overclock**: XMP/EXPO/PBO (+500 pts)
- **Arquitectura**: 3D V-Cache, Chiplet (+500 pts)
- **Virtualización**: VT-X, AMD-V (+500 pts)
- **Seguridad**: TPM, SGX (+500 pts)

---

### 2. PRODUCTIVIDAD (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Cinebench Multi | 3000 pts | 50,000 | `(val / 50000) × 3000` |
| Passmark | 1500 pts | 80,000 | `(val / 80000) × 1500` |
| Hilos | 2000 pts | 32 | `(val / 32) × 2000` |
| eCores | 1000 pts | 16 | `(val / 16) × 1000` |
| RAM Max | 1000 pts | 192 GB | `(val / 192) × 1000` |
| Bonus IA | 750 pts | — | Si tiene IA/NPU |
| Bonus Virtualización | 750 pts | — | Si tiene VT-X |

---

### 3. JUEGOS (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Geekbench Single | 3000 pts | 3,600 | `(val / 3600) × 3000` |
| Núcleos escalonados | — | — | 8+ cores=1000, 6=850, 4=400 |
| Cache | 2500 pts | 150 MB | `(val / 150) × 2500` |
| Turbo Freq | 1500 pts | 6.2 GHz | `(val / 6.2) × 1500` |
| RAM DDR5 | 1000 pts | — | Si DDR5 |
| PCIe 5.0 | 1000 pts | — | Si PCIe 5.0 |

---

### 4. EFICIENCIA (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Rendimiento/vatio | 7000 pts | 300 pts | `(ratio / 300) × 7000` |
| Huella térmica | 3000 pts | — | `((250 - TDP) / 200) × 3000` |

---

## 🎮 GPU — 5 Notas Técnicas

### 1. POTENCIA (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| **Time Spy** | 4000 pts | 50,000 | `(val / 50000) × 4000` |
| **Port Royal** | 2000 pts | 38,000 | `(val / 38000) × 2000` |
| **VRAM Capacidad** | 1000 pts | 32 GB | `(val / 32) × 1000` |
| **Tipo VRAM** | 1000 pts | — | GDDR7=1000, GDDR6X=850, GDDR6=700, GDDR5=200 |
| **Ancho de banda** | 1000 pts | — | 512=1000, 256=800, 192=600 |
| **TFLOPS FP32** | 500 pts | 100 | `(val / 100) × 500` |
| **Frecuencia Boost** | 500 pts | 3,000 MHz | `(val / 3000) × 500` |

### 2. TECNOLOGIAS (10.000 pts)

| Componente | Peso | Fórmula |
|-----------|------|---------|
| **PCIe** | 2000 pts | 5.0=2000, 4.0=1400, 3.0=700 |
| **Edad** | 1500 pts | `1500 - (age × 150)` |
| **Software VIP** | 5000 pts | 4 categorías (DLSS 4.5, IA, Ray Tracing, Latencia) |

**Categorías VIP:**

| Categoría | Puntos Premium | Puntos Estándar | Keywords |
|-----------|---------------|-----------------|----------|
| Generación fotogramas | 1250 | 750 | `dlss4`, `fsr4` |
| IA Avanzada | 1250 | — | `ia`, `tensor`, `neural` |
| Trazado de Rayos | 1250 | 600 | `ray reconstruction`, `ray tracing` |
| Latencia y ecosistema | 1250 | — | `reflex`, `anti-lag`, `av1` |

### 3. PRODUCTIVIDAD (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Blender | 4500 pts | 20,000 | `(val / 20000) × 4500` |
| VRAM | 3500 pts | 32 GB | `(val / 32) × 3500` |
| TFLOPS | 1000 pts | 100 | `(val / 100) × 1000` |
| Aceleración IA | 1000 pts | — | Si tiene keyword IA |

### 4. JUEGOS (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Time Spy | 4500 pts | 50,000 | `(val / 50000) × 4500` |
| Port Royal | 2500 pts | 38,000 | `(val / 38000) × 2500` |
| VRAM Texturas | 1500 pts | 24 GB | `(val / 24) × 1500` |
| Tech FPS | 1500 pts | — | T1: DLSS4.5/FSR4.1=1500, T2: DLSS3/FSR4=1200, T3: FSR3/XESS=800 |

### 5. EFICIENCIA (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Rendimiento/vatio | 7000 pts | 120 pts | `(ratio / 120) × 7000` |
| Huella térmica | 3000 pts | — | `((600 - TDP) / 450) × 3000` |

---

## 💾 RAM — 5 Notas Técnicas

### 1. VELOCITY (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Frecuencia | 5000 pts | 8,400 MHz | `(val / 8400) × 5000` |
| Ancho de banda (lectura+escrita/2) | 5000 pts | 100 GB/s | `(val / 100) × 5000` |

### 2. TECNOLOGIAS (10.000 pts)

| Componente | Puntos | Fórmula |
|-----------|--------|---------|
| Arquitectura | 4000 pts | DDR5=4000, DDR4=2000, DDR3=500 |
| Overclock (XMP/EXPO) | 3000 pts | Ambas=3000, Una=2000, Ninguna=500 |
| ECC (Error Correction) | 2000 pts | Dedicado=2000, On-die=1000, Ninguno=0 |
| Disipación térmica | 1000 pts | Si tiene heatsink/spreader |

### 3. LATENCIA (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Real (ns) | 6000 pts | Max ≤ 45ns=6000, < 100ns=escala, > 100ns=0 |
| Teórica (FWL: CL × 1000/speed/2) | 4000 pts | Max ≤ 8ns=4000, < 16ns=escala, > 16ns=0 |

### 4. JUEGOS (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Capacidad | 3000 pts | 32 GB | `(val / 32) × 3000` |
| Frecuencia | 4000 pts | 8,400 MHz | `(val / 8400) × 4000` |
| Estabilidad (latencia) | 3000 pts | — | <=45ns=3000, escala, >100ns=0 |

### 5. PRODUCTIVIDAD (10.000 pts)

| Componente | Peso | Máx | Fórmula |
|-----------|------|-----|---------|
| Capacidad | 6000 pts | 64 GB | `(val / 64) × 6000` |
| Flujo de datos | 4000 pts | 8,400 MHz | `(val / 8400) × 4000` |

---

## 💰 Calidad/Precio (Value Score)

**Se calcula a partir de las 5 notas técnicas + precio:**

| Componente | Potencia | Technologies | Productivity | Gaming | Efficiency | Total |
|-----------|----------|-------------|-------------|--------|------------|-------|
| **CPU** | 25% | 15% | 25% | 25% | 10% | 100% |
| **GPU** | 25% | 15% | 25% | 25% | 10% | 100% |
| **RAM** | — | — | 10% | 25% | 25% | 20% Velocidad / 20% Latencia |

Los puntos se normalizan a escala **0-10** y el precio afecta mediante un coeficiente `VALUE_CEILING` de 0.035 (puntos útiles por dólar).

# Inserts actuales en base de datos (cpu, gpu y ram)

## Inserts CPU

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description, 
  price_base, release_date, release_year, compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'cpu-12400f',
  'intel-core-i5-12400f',
  'gaming',
  'Intel Core i5-12400F',
  'Intel',
  'cpu',
  'mid-range',
  'Procesador de escritorio de gama media de la 12ª generación (Alder Lake) de Intel. Ofrece 6 núcleos de alto rendimiento y 12 hilos, con una frecuencia turbo de hasta 4.4 GHz. No incluye gráficos integrados, lo que lo hace una opción popular para builds gaming con GPU dedicada gracias a su excelente relación calidad-precio y bajo consumo.',
  174.00,
  '2022-01-04',
  2022,
  -- Compatibilidad
  '{"socket": "LGA 1700", "ram_frecuency": 4800, "ram_type": "DDR4 / DDR5", "ram_max_support": 128, "chipsets": "H610, B660, H670, Z690, B760, H770, Z790", "pcie": 5}',
  -- Specs
  '{"cores": 6, "efficency_cores": 0, "threads": 12, "base_frequency": 2.5, "turbo_frequency": 4.4, "tdp": 65, "power_base": 65, "power_turbo_max": 117, "architecture": "Alder Lake S", "cache": {"l1": 480, "l2": 7680, "l3": 18432}}',
  -- Technologies
  '[{"name": "Intel Hyper-Threading", "description": "Mejora multitarea."}, {"name": "Intel Turbo Boost 2.0", "description": "Aumenta frecuencia."}, {"name": "PCIe 5.0 Support", "description": "Doble ancho de banda."}, {"name": "Intel Deep Learning Boost", "description": "Acelera IA."}, {"name": "Intel Virtualization Technology", "description": "Múltiples SO."}]',
  -- Benchmarks
  '{"cinebench_multi": 12344, "geekbench_single": 2350, "passmark_score": 19596}',
  -- Tags
  '["12th Gen Intel", "Alder Lake", "LGA 1700", "Budget Gaming", "Best Value"]'
);

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description, 
  price_base, release_date, release_year, compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'cpu-5600x',
  'amd-ryzen-5-5600x',
  'gaming',
  'AMD Ryzen 5 5600X',
  'AMD',
  'cpu',
  'mid-range',
  'CPU de escritorio de gama media de AMD, basado en la arquitectura Zen 3. Con 6 núcleos y 12 hilos, frecuencias de hasta 4.6 GHz y 35 MB de caché, ofrece un excelente rendimiento en juegos y aplicaciones. No incluye gráficos integrados, por lo que necesita una GPU dedicada. Se ha consolidado como una de las mejores opciones calidad-precio de su generación.',
  299.00,
  '2020-11-05',
  2020,
  -- compatibility (JSONB)
  '{
    "socket": "AM4", 
    "ram_frecuency": 3200, 
    "ram_type": "DDR4", 
    "ram_max_support": 128, 
    "chipsets": "A520, B450, B550, X470, X570", 
    "pcie": 4
  }',
  -- specs (JSONB)
  '{
    "cores": 6, 
    "efficency_cores": 0, 
    "threads": 12, 
    "base_frequency": 3.7, 
    "turbo_frequency": 4.6, 
    "tdp": 65, 
    "power_base": 65, 
    "power_turbo_max": 88, 
    "architecture": "Zen 3 (Vermeer)", 
    "cache": {"l1": 384, "l2": 3072, "l3": 32768}
  }',
  -- technologies (JSONB Array)
  '[
    {"name": "Precision Boost 2", "description": "Optimiza el rendimiento según carga y temperatura."},
    {"name": "AMD StoreMI", "description": "Acelera el almacenamiento combinando SSD y HDD."},
    {"name": "TSMC 7nm FinFET", "description": "Proceso de fabricación eficiente."},
    {"name": "Unlocked for Overclocking", "description": "Permite aumentar frecuencia fácilmente."},
    {"name": "SMT", "description": "Simultaneous Multithreading: ejecuta dos hilos por núcleo para mejorar el rendimiento en multitarea."},
    {"name": "AMD-V", "description": "Tecnología de virtualización de AMD que permite ejecutar múltiples sistemas operativos de forma eficiente."}
  ]',
  -- benchmarks (JSONB)
  '{
    "cinebench_multi": 12000, 
    "geekbench_single": 1700, 
    "passmark_score": 21911
  }',
  -- tags (JSONB Array)
  '["Zen 3", "AM4", "Budget Gaming", "Best Value", "6 Cores"]'
);

## Inserts GPU

###### intel arc B580

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description,
  price_base_usd, price_base_eur, release_date, release_year, compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'gpu-b580',
  'intel-arc-b580',
  'mid-range',
  'Intel Arc B580',
  'Intel',
  'GPU',
  'graphics_card',
  'Tarjeta gráfica de gama media de Intel basada en la arquitectura Xe2-HPG (Battlemage), lanzada en diciembre de 2024. Con 12 GB de memoria GDDR6 y 20 núcleos Xe, ofrece un rendimiento sólido para gaming 1080p y 1440p, con un enfoque en eficiencia y precio competitivo. Soporta trazado de rayos por hardware y tecnologías de IA como XeSS.',
  249.00,
  229.08,
  '2024-12-03',
  2024,
  -- compatibility (JSONB)
  '{
    "pcie_generation": 4.0,
    "support_display": 4,
    "max_resolution": "7680x4320",
    "hdpc_support": 2.3,
    "connector": "1 x 16",
    "power_connectors": ["1x 8-pin"],
    "directx": 12,
    "opengl": 4.6
  }',
  -- specs (JSONB) con processing_units en inglés
  '{
    "vram_capacity": 12,
    "vram_type": "GDDR6",
    "bus_width": 192,
    "cuda_cores_stream_processors": 2560,
    "tdp": 190,
    "core_clock": 2850,
    "tflops_fp32": 13.67,
    "architecture": "Xe2-HPG (Battlemage)",
    "processing_units": {
      "main_cores": "20 Xe-cores",
      "shading_units_total": 2560,
      "ia_engines": 160,
      "rt_engines": 20
    }
  }',
  -- technologies (JSONB Array)
  '[
    {"name": "XeSS 2", "description": "Supermuestreo por IA para mejorar el rendimiento en juegos."},
    {"name": "Ray Tracing Unidades", "description": "20 motores de trazado de rayos dedicados para iluminación y reflejos realistas."},
    {"name": "Intel Deep Link", "description": "Permite compartir potencia entre la GPU e iGPU de Intel."}
  ]',
  -- benchmarks (JSONB)
  '{
    "1080p_gaming_avg_fps": 125,
    "1440p_gaming_avg_fps": 85,
    "4k_gaming_avg_fps": 35,
    "3dmark_time_spy_extreme": 8500,
    "blender_score": 2150.5,
    "ray_tracing_performance": "Medium"
    "3dmark_time_spy": 14665,
    "3dmark_port_royal": 7066,
    "3dmark_speed_way": 2881
  }',
  -- tags (JSONB Array)
  '["Battlemage", "1080p Gaming", "XeSS", "Budget"]'
);

###### rtx 5070

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description,
  price_base_usd, price_base_eur, release_date, release_year, compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'gpu-5070',
  'geforce-rtx-5070',
  'enthusiast',
  'GeForce RTX 5070',
  'NVIDIA',
  'GPU',
  'graphics_card',
  'Tarjeta gráfica de gama alta basada en la arquitectura Blackwell de NVIDIA, lanzada en 2025. Con 12 GB de memoria GDDR7 y hardware optimizado para IA, está diseñada para ofrecer un excelente rendimiento en juegos a 1440p y 4K, principalmente potenciado por la nueva tecnología de generación de fotogramas DLSS 4.',
  549.00,
  505.08,
  '2025-01-06',
  2025,
  -- compatibility (JSONB)
  '{
    "pcie_generation": 5.0,
    "support_display": 4,
    "max_resolution": "7680x4320",
    "hdpc_support": 2.3,
    "connector": "1 x 16",
    "power_connectors": ["1x 12VHPWR", "2x 8-pin"],
    "directx": 12,
    "opengl": 4.6
  }',
  -- specs (JSONB) con processing_units integrado y en inglés
  '{
    "vram_capacity": 12,
    "vram_type": "GDDR7",
    "bus_width": 192,
    "cuda_cores_stream_processors": 6144,
    "tdp": 250,
    "tflops_fp32": 30.84,
    "core_clock": 2512,
    "architecture": "Blackwell",
    "processing_units": {
      "main_cores": "",
      "shading_units": 0,
      "ia_engines": 0,
      "rt_engines": 0
    }
  }',
  -- technologies (JSONB Array)
  '[
    {"name": "DLSS 4", "description": "Incluye la nueva función Multi Frame Generation y modelos Transformer mejorados."},
    {"name": "Ray Reconstruction", "description": "Mejora la calidad visual del trazado de rayos mediante el uso de redes neuronales."},
    {"name": "NVIDIA Reflex 2", "description": "Reduce la latencia del sistema para mejorar la capacidad de respuesta en juegos competitivos."}
  ]',
  -- benchmarks (JSONB)
  '{
    "1080p_gaming_avg_fps": 160,
    "1440p_gaming_avg_fps": 120,
    "4k_gaming_avg_fps": 60,
    "3dmark_time_spy_extreme": 10645,
    "blender_score": 6150.01,
    "ray_tracing_performance": "High"
    "3dmark_time_spy": 22327,
    "3dmark_port_royal": 14136,
    "3dmark_speed_way": 5515
  }',
  -- tags (JSONB Array)
  '["Blackwell", "1440p Gaming", "DLSS 4"]'
);

###### rtx 5090

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description,
  price_base_usd, price_base_eur, release_date, release_year, 
  compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'gpu-5090',
  'geforce-rtx-5090',
  'enthusiast',
  'GeForce RTX 5090',
  'NVIDIA',
  'GPU',
  'graphics_card',
  'Tarjeta gráfica tope de gama basada en la arquitectura NVIDIA Blackwell. Con 32 GB de memoria GDDR7 y 21.760 núcleos CUDA, ofrece un rendimiento extremo para gaming 4K, creación de contenido y cargas de trabajo de IA. Soporta trazado de rayos completo y tecnologías como DLSS 4 con Multi Frame Generation.',
  1999.00,   -- price_base_usd (precio oficial de lanzamiento)
  1845.00,   -- price_base_eur (conversión aproximada, puedes ajustarlo al precio real en euros)
  '2025-01-30',
  2025,
  -- compatibility (JSONB)
  '{
    "pcie_generation": 5.0,
    "support_display": 4,
    "max_resolution": "7680x4320",
    "hdpc_support": 2.3,
    "connector": "1 x 16",
    "power_connectors": ["1x 16-pin"],
    "directx": 12,
    "opengl": 4.6
  }',
  -- specs (JSONB)
  '{
    "vram_capacity": 32,
    "vram_type": "GDDR7",
    "bus_width": 512,
    "cuda_cores_stream_processors": 21760,
    "tdp": 575,
    "tflops_fp32": 104.80,
    "core_clock": 2017,
    "boost_clock": 2407,
    "architecture": "Blackwell",
    "processing_units": {
      "main_cores": "170 SM",
      "shading_units": 21760,
      "tmus": 680,
      "rops": 176,
      "tensor_cores": 680,
      "rt_cores": 170
    }
  }',
  -- technologies (JSONB Array)
  '[
    {"name": "DLSS 4", "description": "Incluye Multi Frame Generation y modelos Transformer para aumentar drásticamente el rendimiento con IA."},
    {"name": "Ray Reconstruction", "description": "Utiliza redes neuronales para mejorar la calidad visual del trazado de rayos."},
    {"name": "NVIDIA Reflex 2", "description": "Tecnología que reduce la latencia del sistema para una ventaja competitiva en juegos."}
  ]',
  -- benchmarks (JSONB)
  '{
    "1080p_gaming_avg_fps": 186,
    "1440p_gaming_avg_fps": 150,
    "4k_gaming_avg_fps": 95,
    "3dmark_time_spy_extreme": 25431,
    "blender_score": 17822.17,
    "ray_tracing_performance": "Very High",
    "3dmark_time_spy": 48169,
    "3dmark_port_royal": 35994,
    "3dmark_speed_way": 14278
  }',
  -- tags (JSONB Array)
  '["Blackwell", "4K Gaming", "DLSS 4", "Enthusiast"]'
);


###### rx 9070 xt

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description,
  price_base_usd, price_base_eur, release_date, release_year, 
  compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'gpu-9070xt',
  'radeon-rx-9070-xt',
  'enthusiast',
  'Radeon RX 9070 XT',
  'AMD',
  'GPU',
  'graphics_card',
  'Tarjeta gráfica de gama alta basada en la arquitectura RDNA 4 de AMD. Con 16 GB de memoria GDDR6 y 4096 stream processors, ofrece un rendimiento excepcional para gaming 1440p y 4K. Incorpora aceleradores de IA de 2ª generación, trazado de rayos de 3ª generación y soporte para FSR 4 "Redstone" con reescalado por machine learning.',
  599.00,
  689.00,
  '2025-03-06',
  2025,
  -- compatibility (JSONB)
  '{
    "pcie_generation": 5.0,
    "support_display": 4,
    "max_resolution": "7680x4320",
    "hdpc_support": 2.3,
    "connector": "1 x 16",
    "power_connectors": ["2x 8-pin"],
    "directx": 12,
    "opengl": 4.6
  }',
  -- specs (JSONB)
  '{
    "vram_capacity": 16,
    "vram_type": "GDDR6",
    "bus_width": 256,
    "cuda_cores_stream_processors": 4096,
    "tdp": 304,
    "tflops_fp32": 48.7,
    "core_clock": 2400,
    "boost_clock": 2970,
    "architecture": "RDNA 4",
    "processing_units": {
      "compute_units": 64,
      "shading_units": 4096,
      "ray_accelerators": 64,
      "ai_accelerators": 128,
      "rops": 128,
      "tmus": 256
    }
  }',
  -- technologies (JSONB Array)
  '[
    {"name": "FSR 4 \"Redstone\"", "description": "Suite de tecnologías con reescalado por ML, generación de fotogramas y regeneración de rayos."},
    {"name": "AMD Fluid Motion Frames", "description": "Generación de fotogramas a nivel de driver para aumentar la fluidez en juegos."},
    {"name": "AMD Smart Access Memory", "description": "Permite al procesador acceder a toda la memoria de la GPU para mejorar el rendimiento."},
    {"name": "3rd Gen Ray Accelerators", "description": "Aceleradores de trazado de rayos de tercera generación con el doble de rendimiento que RDNA 3."}
  ]',
  -- benchmarks (JSONB)
  '{
    "1080p_gaming_avg_fps": 97,
    "1440p_gaming_avg_fps": 73,
    "4k_gaming_avg_fps": 30,
    "3dmark_time_spy_extreme": 14416,
    "blender_score": 3133.46,
    "ray_tracing_performance": "High",
    "3dmark_time_spy": 29807,
    "3dmark_port_royal": 14723,
    "3dmark_speed_way": 6345
  }',
  -- tags (JSONB Array)
  '["RDNA 4", "1440p Gaming", "FSR 4", "Enthusiast"]'
);

## Inserts RAM

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description,
  price_base_usd, price_base_eur, release_date, release_year, compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'mem-003',
  'ddr4-16gb-2x8-3200-cl16-kit',
  'budget',
  'DDR4 16GB (2x8GB) 3200MHz CL16 Kit',
  'Generic', -- En el .md figura como Unspecified, ponemos un valor por defecto
  'RAM',
  'Memory Module',
  'Kit de memoria RAM DDR4 de 16GB (2 módulos de 8GB) a 3200MHz con latencia CL16. Es una opción común y equilibrada para PC de escritorio de gama media, que ofrece un buen rendimiento para juegos y tareas de productividad. Opera a 1.35V y soporta perfiles Intel XMP 2.0.',
  45.00,
  50.00,
  '2020-01-01',
  2020,
  -- compatibility: Aunque no se detalla un objeto específico en el MD, 
  -- dejamos un objeto vacío o con el estándar DDR4
  '{"technology": "DDR4"}',
  -- specs (JSONB): Mantenemos las claves en inglés del MD
  '{
    "capacity": 16,
    "dual_channel": "2x8",
    "technology": "DDR4",
    "speed": 3200,
    "latency": 16,
    "voltage": 1.35,
    "has_dram_cache": false,
    "profile_support": ["XMP 2.0", "EXPO"],
    "ecc_support": false,
    "overclocking_headroom": "Medium"
  }',
  -- technologies (JSONB Array)
  '[
    {"name": "Intel XMP 2.0", "description": "Perfil de memoria extremo que permite overclocking con un solo clic."},
    {"name": "AMD EXPO", "description": "Perfil de overclocking de memoria optimizado para plataformas AMD."},
    {"name": "Aluminum Heat Spreader", "description": "Disipador de calor pasivo para una mejor gestión térmica."}
  ]',
  -- benchmarks (JSONB)
  '{
    "read_speed": 45,
    "write_speed": 43,
    "latency_ns": 70
  }',
  -- tags (JSONB Array)
  '["DDR4", "Budget", "16GB"]'
);

INSERT INTO products (
  id, slug, market_segment, name, brand, type, category, description,
  price_base_usd, price_base_eur, release_date, release_year, compatibility, specs, technologies, benchmarks, tags
) VALUES (
  'mem-004',
  'ddr5-32gb-2x16-6000-cl36-kit',
  'performance',
  'DDR5 32GB (2x16GB) 6000MHz CL36 Kit',
  'Generic',
  'RAM',
  'Memory Module',
  'Kit de memoria RAM DDR5 de 32GB (2 módulos de 16GB) a 6000MHz con latencia CL36. Ideal para plataformas modernas de entusiastas y gaming de alto rendimiento, ofreciendo un excelente equilibrio entre velocidad y latencia. Opera a 1.35V y soporta perfiles XMP 3.0 y EXPO.',
  110.00,
  118.00,
  '2022-09-01',
  2022,
  -- compatibility
  '{"technology": "DDR5"}',
  -- specs (JSONB)
  '{
    "capacity": 32,
    "dual_channel": "2x16",
    "technology": "DDR5",
    "speed": 6000,
    "latency": 36,
    "voltage": 1.35,
    "has_dram_cache": false,
    "profile_support": ["XMP 3.0", "EXPO"],
    "ecc_support": false,
    "overclocking_headroom": "Medium"
  }',
  -- technologies (JSONB Array)
  '[
    {"name": "Intel XMP 3.0", "description": "Perfil de memoria extremo con perfiles configurables y soporte para overclocking dinámico."},
    {"name": "AMD EXPO", "description": "Perfil de overclocking de memoria optimizado específicamente para plataformas AMD Ryzen."},
    {"name": "On-die ECC", "description": "Corrección de errores interna para mayor estabilidad, típica en memorias DDR5."}
  ]',
  -- benchmarks (JSONB)
  '{
    "read_speed": 75,
    "write_speed": 72,
    "latency_ns": 65
  }',
  -- tags (JSONB Array)
  '["DDR5", "32GB", "High Performance", "EXPO", "XMP 3.0"]'
);
