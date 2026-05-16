# Instrucciones

- No podras matar las ejecuciones de node
- Te fijaras en como estan construidas y como funcionan las notas de los CPU, seran tu ejemplo
- No puedes modificar nada de lo que ya esta construido de las notas de CPU
- No debes modificar nada del codigo actual, todo debe seguir funcionando como eesta actualmente
- Verifica con pnpm run dev que funcionen y se muestren correctamente las notas
- Implementa nota por nota, por ejemplo, implementa potencia, una vez lo implementas, verifica que esa nota funcione correctamente y los resultados son correctos, una vez lo verifiques pasas a la siguiente que seria tecnologias, y asi sucesivamente
- Usa la misma estructura que usamos para las notas de las CPU
- La nota de la calidad precio no sera calculada aun, una vez que termines las 5 primeras notas (potencia, tecnologias, productividad, juegos y eficiencia) tu trabajo habra terminado
- No puedes instalar dependecias ni agregar nada, solo implementar codigo
- Los archivos y estructuras para GPU ya estan creados, solo debes modificarlos, actualmente devuelven por defecto 7.5

# Tabla y inserts DB

CREATE TABLE products (
  id TEXT PRIMARY KEY, -- Usamos el ID de tu .md como clave primaria
  slug TEXT UNIQUE NOT NULL,
  market_segment TEXT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL, -- CPU, GPU, etc.
  category TEXT,
  description TEXT,
  price_base_usd NUMERIC(10, 2),
  price_base_eur NUMERIC(10, 2),
  release_date DATE,
  release_year INTEGER,
  
  -- Campos JSONB para flexibilidad total
  compatibility JSONB DEFAULT '{}'::jsonb,
  specs JSONB DEFAULT '{}'::jsonb,
  technologies JSONB DEFAULT '[]'::jsonb,
  benchmarks JSONB DEFAULT '{}'::jsonb,
  unidades_procesamiento JSONB DEFAULT '{}'::jsonb, -- Específico para GPUs
  tags JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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


# Notas

## Potencia

-El musculo sintético (6000pts)
  3Dmark Time Spy(Graficos)(4000pts): Para medir la rasterizacion, techo 50000
  3Dmark Port Royal / Speed Way (2000pts): para trazado de rayos, techo 38000

-Subsistema de Memoria(VRAM)(3000pts)
  Capacidad de VRAM (1000pts), techo 32gb
  Tipo de memoria(1000pts)
    GDDR7: 1000pts
    GDDR6X: 850pts
    GDDR6: 700pts
    GDDR5: 200pts
  Ancho de banda(1000pts)
  +512 : 1000pts
  +256: 800pts
  +192: 600pts
  +128: 400pts

-El corazon del chip(1000pts)
  TFLOPS FP32 (500pts): techo 100TFLOPS
  Frecuencia Boost (500pts): Techo 3.0GHz o 3000MHz (core clock)

###### Formula de ejemplos

🔵 **Cálculo 1: Intel Arc B580**

- **Time Spy (14,665 pts):** `(14665 / 50000) * 4000` = **1,173 pts**
    
- **Port Royal (7,066 pts):** `(7066 / 38000) * 2000` = **372 pts**
    
- **VRAM (12 GB):** `(12 / 32) * 1000` = **375 pts**
    
- **Memoria (GDDR6):** **700 pts**
    
- **Bus (192-bit):** **600 pts**
    
- **TFLOPS (13.67):** `(13.67 / 100) * 500` = **68 pts**
    
- **Frecuencia (2,850 MHz):** `(2850 / 3000) * 500` = **475 pts**
    
- **Puntaje Total B580:** **3,763 puntos 👉 ¡Nota de Potencia: 3.76 / 10!**
    

🟢 **Cálculo 2: NVIDIA GeForce RTX 5070**

- **Time Spy (22,327 pts):** `(22327 / 50000) * 4000` = **1,786 pts**
    
- **Port Royal (14,136 pts):** `(14136 / 38000) * 2000` = **744 pts**
    
- **VRAM (12 GB):** `(12 / 32) * 1000` = **375 pts**
    
- **Memoria (GDDR7):** **1,000 pts**
    
- **Bus (192-bit):** **600 pts**
    
- **TFLOPS (30.84):** `(30.84 / 100) * 500` = **154 pts**
    
- **Frecuencia (2,512 MHz):** `(2512 / 3000) * 500` = **419 pts**
    
- **Puntaje Total 5070:** **5,078 puntos 👉 ¡Nota de Potencia: 5.08 / 10!**


## Tecnologías

1.Plataforma y Estandares(3000pts)
-Generacion de PCIe(2000pts)
	PCIe 5.0: 2000pts
	PCIe 4.0: 1400pts
	PCIe 5.0: 700pts

-Soporte de APIS modernas(1000)
Si tiene drectx 12 y opengl 4.6 se lleva los 1000pts

2.Penalizacion por edad(2000pts)
  todas tienen 2000pts base, pero se le resta 200pts por cada año de antiguedad

3.Lista VIP de Software e IA (5000pts)
Tendremos 4 categorías en cada categoría se detectaran palabras clave, al tener al menos 1 ya se lleva los puntos de esa categoría, serán 1250pts para cada categoría

-cat 1: Generacion de Fotogramas y escalado:
	Palabras a detectar: dlss3, dlss 3.5, dlss4, dlss 4.5, frame generation, xess 2, xess 3. afmf, fsr3, fsr 4, fsr 4.1
-cat 2: IA Anavnzada
	Palabras: ia, ai, tensor, redes neuronales, xmx, transformer, neural networks
-cat 3: Trazado de Rayos nueva generacion
	Palabrras: ray tracing, trazado de rayos, ray reconstruction, path tracing
-cat 4: Latencia y ecosistema
	Palabras: reflex, anti-lag, baja latencia, low latency, deep link, av1

###### Ejemplos con formulas

🔵 **Cálculo 1: Intel Arc B580 (Lanzada en 2024 = 2 Años)**

- **PCIe (4.0):** **1,400 pts**
    
- **APIs (DX12 / OpenGL 4.6):** **1,000 pts**
    
- **Edad (2 Años):** `2000 - (2 * 200)` = **1,600 pts**
    
- **VIP 1 (Generación/Escalado):** Encuentra "XeSS 2" = **1,250 pts**
    
- **VIP 2 (Inteligencia Artificial):** Encuentra "IA" en la descripción = **1,250 pts**
    
- **VIP 3 (Trazado de Rayos):** Encuentra "trazado de rayos" = **1,250 pts**
    
- **VIP 4 (Latencia):** No encuentra palabras clave en tu JSON = **0 pts** _(Nota: Tiene Deep Link, pero nuestro script buscaba ecosistemas de latencia. Podrías agregar "deep link" a las palabras clave de la Categoría 4)._
    
- **Puntaje Total B580:** 7,750 puntos 👉 **Nota de Tecnologías: 7.75 / 10**
    

🟢 **Cálculo 2: NVIDIA GeForce RTX 5070 (Lanzada en 2025 = 1 Año)**

- **PCIe (5.0):** **2,000 pts**
    
- **APIs (DX12 / OpenGL 4.6):** **1,000 pts**
    
- **Edad (1 Año):** `2000 - (1 * 200)` = **1,800 pts**
    
- **VIP 1 (Generación/Escalado):** Encuentra "DLSS 4" y "Frame Generation" = **1,250 pts**
    
- **VIP 2 (Inteligencia Artificial):** Encuentra "redes neuronales" y "Transformer" = **1,250 pts**
    
- **VIP 3 (Trazado de Rayos):** Encuentra "Ray Reconstruction" = **1,250 pts**
    
- **VIP 4 (Latencia):** Encuentra "Reflex" y "latencia" = **1,250 pts**
    
- **Puntaje Total 5070:** 9,800 puntos 👉 **Nota de Tecnologías: 9.80 / 10**
## Productividad

1.Renderizado 3D puro(4500pts)
aca solo tendremos en cuenta blender_score
blender score, techo 20000pts
_Fórmula:_ `(blender_score / 20000) * 4500`

2.Capacidad de memoria VRAM (3500pts)
aca soloamente tendremos en cuenta la cantidad de vram
techo de vram 32gb
_Fórmula:_ `(vram_capacity / 32) * 3500`

3.Fuerza Computacional Bruta(1000pts)
Usaremos los TFLOPS FP32
Techo, 100 TFLOPS
_Fórmula:_ `(tflops_fp32 / 100) * 1000`

4.Aceleracion Profesional (1000pts)
Aca buscaremos palabras clave en technologies, si encuentra 1 se lleva los 1000pts
palabras: machine learning, ia, ai, redes neuronales, neural networks, av1, tensor

###### Formulas con ejemplos

🟢 **Cálculo 1: NVIDIA GeForce RTX 5070**

- **Blender (6,150 pts):** `(6150 / 20000) * 4500` = **1,383 pts**
    
- **VRAM (12 GB):** `(12 / 32) * 3500` = **1,312 pts**
    
- **TFLOPS (30.84):** `(30.84 / 100) * 1000` = **308 pts**
    
- **Aceleración VIP:** Encuentra "redes neuronales" = **1,000 pts**
    
- **Puntaje Total 5070:** **4,003 puntos 👉 ¡Nota de Productividad: 4.00 / 10!**
    

🔴 **Cálculo 2: AMD Radeon RX 9070 XT**

- **Blender (3,133 pts):** `(3133 / 20000) * 4500` = **705 pts**
    
- **VRAM (16 GB):** `(16 / 32) * 3500` = **1,750 pts**
    
- **TFLOPS (48.70):** `(48.70 / 100) * 1000` = **487 pts**
    
- **Aceleración VIP:** Encuentra "machine learning" / "ai_accelerators" = **1,000 pts**
    
- **Puntaje Total 9070 XT:** **3,942 puntos 👉 ¡Nota de Productividad: 3.94 / 10!**


## Juegos

1.Motor Grafico de Rasterizacion (4500pts)
Aca usaremos Time Spy
Techo 50000pts
_Fórmula:_ `(3dmark_time_spy / 50000) * 4500`

2.Motor Grafico de Ray Tracing(2500pts)
Port Royal, techo 38000pts
_Fórmula:_ `(3dmark_port_royal / 38000) * 2500`

3.Capacidad de Texturas Ultra - VRAM (1500pts)
Aca mediremos la VRAM
VRAM techo 24gb, mas de 24gb se gana todos los pts
_Fórmula:_ `(vram_capacity / 24) * 1500`

4.Tecnologias de Multiplicacion de FPS(1500pts)
En el array de tecnologias se buscara y se detectara

DLSS 4 o DLSS 4.5 o FSR 4.1: 1500pts
DLSS 3 o DLSS 3.5 o FSR 4: 1200pts
FSR 3 o XeSS o FSR 2: 800pts

###### Formulas y ejemplos
🟢 **Cálculo 1: NVIDIA GeForce RTX 5070**

- **Motor DX12 (22,327):** `(22327 / 50000) * 4500` = **2,009 pts**
    
- **Motor Ray Tracing (14,136):** `(14136 / 38000) * 2500` = **930 pts**
    
- **Texturas VRAM (12 GB):** `(12 / 24) * 1500` = **750 pts**
    
- **Tecnología Gaming (DLSS 4):** **1,500 pts**
    
- **Puntaje Total 5070:** **5,189 puntos 👉 ¡Nueva Nota de Juegos: 5.19 / 10!**
    

👑 **Cálculo 2: NVIDIA GeForce RTX 5090**

- **Motor DX12 (48,169):** `(48169 / 50000) * 4500` = **4,335 pts**
    
- **Motor Ray Tracing (35,994):** `(35994 / 38000) * 2500` = **2,368 pts**
    
- **Texturas VRAM (32 GB):** Supera el techo de 24GB, se lleva el máximo = **1,500 pts**
    
- **Tecnología Gaming (DLSS 4):** **1,500 pts**
    
- **Puntaje Total 5090:** **9,703 puntos 👉 ¡Nueva Nota de Juegos: 9.70 / 10!**

🔴 **Cálculo 3: AMD Radeon RX 9070 XT**

- **Motor DX12 (29,807):** `(29807 / 50000) * 4500` = **2,683 pts**
    
- **Motor Ray Tracing (14,723):** `(14723 / 38000) * 2500` = **969 pts**
    
- **Texturas VRAM (16 GB):** `(16 / 24) * 1500` = **1,000 pts**
    
- **Tecnología Gaming (FSR 4):** **1,200 pts**
    
- **Puntaje Total 9070 XT:** **5,852 puntos 👉 ¡Nueva Nota de Juegos: 5.85 / 10!**
    

🔵 **Cálculo 4: Intel Arc B580**

- **Motor DX12 (14,665):** `(14665 / 50000) * 4500` = **1,320 pts**
    
- **Motor Ray Tracing (7,066):** `(7066 / 38000) * 2500` = **465 pts**
    
- **Texturas VRAM (12 GB):** `(12 / 24) * 1500` = **750 pts**
    
- **Tecnología Gaming (XeSS 2):** **800 pts**
    
- **Puntaje Total B580:** **3,335 puntos 👉 ¡Nueva Nota de Juegos: 3.33 / 10!**




## Eficiencia

1.Rendimiento por Vatio (7000pts)
Mediremos cuántos puntos del motor de rasterización (Time Spy normal) nos da la gráfica por cada vatio consumido (`tdp`).
_Fórmula:_ `(3dmark_time_spy / tdp)`
Techo 120pts por Vatio
_Asignación:_ `(Ratio / 120) * 7000`

2.Huella Termica(3000pts)
Aca mediremos directamente cuantos watts consume la tarjeta en total
Techo de perfeccion 150w o menos se llevarian los 3000pts
Techo de 0 600W o mas sellevan un 0
_Fórmula:_ `((600 - tdp) / 450) * 3000` _(Con un máximo de 3000)._

###### Ejemplos con formulas

🟢 **Cálculo 1: NVIDIA GeForce RTX 5070 (TDP: 250W)**

- **Ratio Bruto:** 22,327 pts / 250W = **89.31 Puntos por Vatio**
    
- **Bolsa 1 (Rendimiento):** `(89.31 / 120) * 7000` = **5,210 pts**
    
- **Bolsa 2 (Tamaño 250W):** `((600 - 250) / 450) * 3000` = **2,333 pts**
    
- **Total 5070:** 7,543 Puntos 👉 **Nota de Eficiencia: 7.54 / 10**
    

🔴 **Cálculo 2: AMD Radeon RX 9070 XT (TDP: 304W)**

- **Ratio Bruto:** 29,807 pts / 304W = **98.05 Puntos por Vatio**
    
- **Bolsa 1 (Rendimiento):** `(98.05 / 120) * 7000` = **5,720 pts**
    
- **Bolsa 2 (Tamaño 304W):** `((600 - 304) / 450) * 3000` = **1,973 pts**
    
- **Total 9070 XT:** 7,693 Puntos 👉 **Nota de Eficiencia: 7.69 / 10**
    

👑 **Cálculo 3: NVIDIA GeForce RTX 5090 (TDP: 575W)**

- **Ratio Bruto:** 48,169 pts / 575W = **83.77 Puntos por Vatio**
    
- **Bolsa 1 (Rendimiento):** `(83.77 / 120) * 7000` = **4,887 pts**
    
- **Bolsa 2 (Tamaño 575W):** `((600 - 575) / 450) * 3000` = **167 pts** _(Casi reprobada por masiva)_
    
- **Total 5090:** 5,054 Puntos 👉 **Nota de Eficiencia: 5.05 / 10**
    

🔵 **Cálculo 4: Intel Arc B580 (TDP: 190W)**

- **Ratio Bruto:** 14,665 pts / 190W = **77.18 Puntos por Vatio**
    
- **Bolsa 1 (Rendimiento):** `(77.18 / 120) * 7000` = **4,502 pts**
    
- **Bolsa 2 (Tamaño 190W):** `((600 - 190) / 450) * 3000` = **2,733 pts** _(Suma muchísimo por ser compacta)_
    
- **Total B580:** 7,235 Puntos 👉 **Nota de Eficiencia: 7.24 / 10**