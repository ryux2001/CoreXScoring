📊 EXPLICACIÓN DE TODAS LAS NOTAS
CPU - CPU_CONFIG (10000 pts totales)
1. POTENCY (Potencia Real) - 10000 pts
- Benchmarks (7000 pts): Cinebench 3500 + Geekbench 2100 + Passmark 1400
- Especificaciones (3000 pts): Turbo 1200 + Hilos 900 + Cache 900
2. GAMING (Gaming) - 10000 pts
- Benchmarks + Núcleos (4000 pts): Geekbench 3000 + Núcleos 1000 (escalado)
- Cache + Frecuencias (4000 pts): Cache 2500 + Turbo 1500
- Plataforma (2000 pts): RAM 1000/750/400 + PCIe 1000/900/500
3. PRODUCTIVIDAD (Productividad) - 10000 pts
- Fuerza Bruta (4500 pts): Cinebench 3000 + Passmark 1500
- Capacidad Física (3000 pts): Hilos 2000 + Ecores 1000
- Ecosistema Profesional (2500 pts): RAM máx 1000
- Bonus: Virtualización 750 + IA 750
4. TECNOLOGÍAS (Tecnologías) - 10000 pts
- RAM (2000 pts): DDR5/DDR4/DDR3
- PCIe (2000 pts): 5.0/4.0/3.0
- Keywords (3000 pts): IA/multithread/overclock/architecture/virtualization/security (500 pts cada una)
5. EFICIENCIA (Eficiencia) - 10000 pts
- Rendimiento por vatio (7000 pts): Ratio rendimiento/watt
- Huella de consumo (3000 pts): Penalización por consumo alto
GPU - GPU_CONFIG (10000 pts por categoría)
1. POTENCIA (Potencia Real) - 10000 pts
- Benchmarks (6000 pts): Time Spy 4000 + Port Royal 2000
- VRAM (3000 pts): Capacidad 1000 + Tipo 1000 + Ancho de banda 1000
- Chip (1000 pts): TFLOPS 500 + Frecuencia 500
2. GAMING (Gaming) - 10000 pts
- Rasterización (4500 pts): Time Spy benchmark
- Ray Tracing (2500 pts): Port Royal benchmark
- Texturas (1500 pts): VRAM >= 24GB
- FPS Tech (1500 pts): DLSS 4/FSR 4.1 = 1500, DLSS 3/FSR 4 = 1200, FSR 3 = 800
3. PRODUCTIVIDAD (Productividad) - 10000 pts
- Renderizado 3D (4500 pts): Blender score
- VRAM (3500 pts): Capacidad VRAM
- Fuerza Bruta (1000 pts): TFLOPS FP32
- Aceleración (1000 pts): ML/IA/AV1 keywords
4. TECNOLOGÍAS (Tecnologías) - 10000 pts
- Plataforma (3000 pts): PCIe 2000 + APIs 1000
- Penalización Edad (2000 pts): -200 pts/año de antigüedad
- Software VIP (5000 pts): 4 categorías de IA/features premium
5. EFICIENCIA (Eficiencia) - 10000 pts
- Ratio (7000 pts): Rendimiento por watt
- Footprint (3000 pts): Penalización por consumo > 450W
RAM - RAM_CONFIG (10000 pts por categoría)
1. VELOCIDAD (Velocidad) - 10000 pts
- Frecuencia (5000 pts): MHz
- Ancho de banda (5000 pts): GB/s
2. LATENCIA (Latencia) - 10000 pts
- Latencia Real (6000 pts): ns medidos
- Latencia Teórica (4000 pts): CL / Frecuencia
3. TECNOLOGÍAS (Tecnologías) - 10000 pts
- Arquitectura (4000 pts): DDR5/DDR4/DDR3
- Overclocking (3000 pts): XMP/EXPO/ambos/nada
- Integridad (2000 pts): ECC dedicado/on-die/nada
- Disipación (1000 pts): Heat spreader keywords
4. JUEGOS (Gaming) - 10000 pts
- Capacidad (3000 pts): GB
- Frecuencia (4000 pts): MHz
- Estabilidad (3000 pts): Latencia ns
5. PRODUCTIVIDAD (Productividad) - 10000 pts
- Capacidad (6000 pts): GB
- Flujo (4000 pts): MHz
VALUE SCORE (Calidad/Precio) - Fórmula Única
Para CPU, GPU y RAM:
GlobalScore = (NOTA1 × PESO1 + NOTA2 × PESO2 + ...) / 100

UsefulPerformance = max(0, GlobalScore - 3.5)

ValueScore = (UsefulPerformance / precio) / CEILING × 10
CPU VALUE_WEIGHTS: Potencia 25%, Tecnologías 15%, Productividad 25%, Gaming 25%, Eficiencia 10%  
GPU VALUE_WEIGHTS: Potencia 25%, Tecnologías 15%, Productividad 25%, Gaming 25%, Eficiencia 10%  
RAM VALUE_WEIGHTS: Velocidad 20%, Latencia 20%, Tecnologías 10%, Juegos 25%, Productividad 25%
CEILING: CPU 0.035, GPU 0.005, RAM 0.035
🔄 COMO NOTESCARD CONSUME LAS NOTAS
Flujo de Datos:
// 1. Componente recibe el producto
NotesCard({ product })

// 2. Llama a getComponentNotes (lib/scoring/index.ts)
const baseNotes = getComponentNotes(product, precioUSD);

// 3. getComponentNotes importa y ejecuta todos los calculos
// CPU: potency, gaming, productivity, technologies, efficiency
// GPU: potency, gaming, productivity, technologies, efficiency
// RAM: velocidad, latencia, tecnologias, juegos, productividad

// 4. Retorna objeto con las 5 notas
{
  POTENCIA: 8.5,
  TECNOLOGIAS: 7.2,
  PRODUCTIVIDAD: 6.8,
  JUEGOS: 9.1,
  EFICIENCIA: 5.5
}

// 5. Mapeo dinámico en el grid
categories.map((cat) => {
  const score = baseNotes[cat];  // Obtiene cada nota
  const styles = getColorStyles(score);  // Color según puntaje
  // Renderiza tarjeta con nota y barra progresiva
})
Paso a paso:
1. getComponentNotes(product, price):
- Ejecuta calculatePotencyScore(product)
- Ejecuta calculateGamingScore(product)
- Ejecuta calculateProductivityScore(product)
- Ejecuta calculateTechnologiesScore(product)
- Ejecuta calculateEfficiencyScore(product)
- Ejecuta calculateValueScore(notes, price, product)
2. NotesCard recibe el objeto de notas:
- Extrae las llaves (Object.keys(baseNotes))
- Mapea cada categoría
- Aplica colores según puntaje (≥9 azul, ≥7 verde, ≥3 amarillo, <3 rojo)
- Muestra nota con 1 decimal y barra proporcional
3. El precio se maneja así:
- Detecta si es EUR o USD
- Evalúa el precio actualizado vía evento updateProductPrice
- Lo usa para calcular el Value Score