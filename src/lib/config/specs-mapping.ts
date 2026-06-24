export interface SpecDefinition {
  key: string;
  label: string;
  format?: (value: any) => string;
}

// Formateadores utilitarios compartidos para limpiar la salida visual
const formatArray = (v: any) => Array.isArray(v) ? v.join(" · ") : String(v);
const formatGhz = (v: any) => `${v} GHz`;
const formatWatts = (v: any) => `${v} W`;
const formatMB = (v: any) => `${v} MB`;
const formatGB = (v: any) => `${v} GB`;

export const COMPONENT_SPECS: Record<string, SpecDefinition[]> = {
  CPU: [
    { key: 'architecture', label: 'Arquitectura' },
    { key: 'socket', label: 'Socket' },
    { key: 'cores', label: 'Núcleos P-Cores' },
    { key: 'efficency_cores', label: 'Núcleos E-Cores' },
    { key: 'threads', label: 'Hilos de Procesamiento' },
    { key: 'base_frequency', label: 'Frecuencia Base', format: formatGhz },
    { key: 'turbo_frequency', label: 'Frecuencia Turbo', format: formatGhz },
    { key: 'tdp', label: 'TDP Base', format: formatWatts },
    { key: 'power_turbo_max', label: 'Consumo Máx (PL2)', format: formatWatts },
    { key: 'cache.l3', label: 'Caché L3', format: (v) => formatMB((v / 1024).toFixed(0)) },
    { key: 'ram_type', label: 'Tipo de Memoria RAM' },
    { key: 'ram_frecuency', label: 'Frecuencia Nativa RAM', format: (v) => `${v} MHz` },
    { key: 'ram_max_support', label: 'Capacidad Máx RAM', format: formatGB },
    { key: 'pcie', label: 'Líneas PCIe Soportadas', format: (v) => `PCIe Gen ${v}` },
    { key: 'chipsets', label: 'Chipsets Compatibles' },
    // Benchmarks Nativos
    { key: 'cinebench_multi', label: 'Cinebench R23 (Multi)' },
    { key: 'geekbench_single', label: 'Geekbench (Single-Core)' },
    { key: 'passmark_score', label: 'PassMark CPU Rating' },
  ],
  GPU: [
    { key: 'architecture', label: 'Arquitectura Core' },
    { key: 'vram_capacity', label: 'Memoria VRAM', format: formatGB },
    { key: 'vram_type', label: 'Tipo de VRAM' },
    { key: 'bus_width', label: 'Bus de Memoria', format: (v) => `${v}-bit` },
    { key: 'cuda_cores_stream_processors', label: 'Shaders / CUDA Cores' },
    { key: 'tflops_fp32', label: 'Cómputo FP32', format: (v) => `${v} TFLOPS` },
    { key: 'core_clock', label: 'Frecuencia del Reloj', format: (v) => `${v} MHz` },
    { key: 'boost_clock', label: 'Reloj Boost/Turbo', format: (v) => `${v} MHz` },
    { key: 'tdp', label: 'TDP Máximo', format: formatWatts },
    { key: 'pcie_generation', label: 'Interfaz Bus', format: (v) => `PCIe Gen ${v}` },
    { key: 'power_connectors', label: 'Alimentación Requ.', format: formatArray },
    { key: 'support_display', label: 'Pantallas Máximas' },
    { key: 'max_resolution', label: 'Resolución Máxima' },
    { key: 'directx', label: 'DirectX API', format: (v) => `DirectX ${v}` },
    // Benchmarks de Rendimiento
    { key: '1080p_gaming_avg_fps', label: 'FPS Promedio (1080p)' },
    { key: '1440p_gaming_avg_fps', label: 'FPS Promedio (1440p)' },
    { key: '4k_gaming_avg_fps', label: 'FPS Promedio (4K)' },
    { key: 'ray_tracing_performance', label: 'Aceleración Ray Tracing' },
    { key: '3dmark_time_spy', label: '3DMark Time Spy (Score)' },
    { key: '3dmark_time_spy_extreme', label: '3DMark Time Spy Extreme' },
    { key: '3dmark_port_royal', label: '3DMark Port Royal (RT)' },
    { key: '3dmark_speed_way', label: '3DMark Speed Way' },
    { key: 'blender_score', label: 'Blender Render Score' },
  ],
  MOTHERBOARD: [
    { key: 'form_factor', label: 'Factor de Forma' },
    { key: 'socket', label: 'Socket Procesador', format: formatArray },
    { key: 'chipsets', label: 'Chipset Integrado', format: formatArray },
    { key: 'power_phases', label: 'Fases de Poder (VRM)' },
    { key: 'vrm_phases', label: 'Fases Totales VRM' },
    { key: 'vrm_quality_rating', label: 'Calificación de VRM', format: (v) => `${v} / 10` },
    { key: 'pcie_generation', label: 'Generación Principal PCIe', format: (v) => `Gen ${v}` },
    { key: 'pcie_slots', label: 'Ranuras Expansión PCIe', format: formatArray },
    { key: 'm2_slots', label: 'Ranuras Almacenamiento M.2', format: formatArray },
    { key: 'ram_support', label: 'Frecuencias RAM Soportadas', format: formatArray },
    { key: 'ethernet', label: 'Controlador Red LAN' },
    { key: 'wifi', label: 'Módulo Inalámbrico Wi-Fi' },
    { key: 'audio_codec', label: 'Chipset de Audio Códec' },
    { key: 'usb_ports.usb_3', label: 'Puertos USB 3.0 / 3.2' },
    { key: 'usb_ports.usb_c', label: 'Puertos USB Tipo-C' },
    { key: 'usb_ports.usb_2', label: 'Puertos USB 2.0 Traseros' },
    { key: 'bios_features', label: 'Características BIOS', format: formatArray },
    // Benchmarks técnicos
    { key: 'vrm_thermal_performance', label: 'Rendimiento Térmico VRM' },
    { key: 'boot_time_seconds', label: 'Tiempo Arranque BIOS', format: (v) => `${v} segundos` },
  ],
  RAM: [
    { key: 'capacity', label: 'Capacidad Total', format: formatGB },
    { key: 'dual_channel', label: 'Configuración Módulos' },
    { key: 'technology', label: 'Generación Tecnológica' },
    { key: 'speed', label: 'Velocidad de Frecuencia', format: (v) => `${v} MHz` },
    { key: 'latency', label: 'Latencia CAS (CL)', format: (v) => `CL${v}` },
    { key: 'voltage', label: 'Voltaje de Operación', format: (v) => `${v} V` },
    { key: 'profile_support', label: 'Perfiles Overclock Soport.', format: formatArray },
    { key: 'has_dram_cache', label: 'Posee Caché DRAM', format: (v) => v ? "Sí" : "No" },
    { key: 'ecc_support', label: 'Soporte de Memoria ECC', format: (v) => v ? "Sí" : "No" },
    { key: 'overclocking_headroom', label: 'Margen de Overclock' },
    // Rendimiento en pruebas
    { key: 'read_speed', label: 'Velocidad Lectura Efectiva', format: (v) => `${v} GB/s` },
    { key: 'write_speed', label: 'Velocidad Escritura Efectiva', format: (v) => `${v} GB/s` },
    { key: 'latency_ns', label: 'Latencia Real de Acceso', format: (v) => `${v} ns` },
  ],
  PSU: [
    { key: 'wattage', label: 'Potencia de Suministro', format: formatWatts },
    { key: 'efficiency', label: 'Certificación Energética' },
    { key: 'modular_type', label: 'Tipo de Modularidad' },
    { key: 'form_factor', label: 'Factor de Forma / Estándar' },
    { key: 'gpu_support', label: 'Soporte de GPUs Verificado', format: formatArray },
    { key: 'protections', label: 'Sistemas de Protección', format: formatArray },
    { key: 'ripple_mv', label: 'Rizado Eléctrico Máx (Ripple)', format: (v) => `${v} mV` },
    // Pruebas e informes de carga
    { key: 'efficiency_load_50', label: 'Eficiencia al 50% de Carga', format: (v) => `${v}%` },
    { key: 'noise_level_db', label: 'Nivel Sonoro Promedio', format: (v) => `${v} dBA` },
  ],
  STORAGE: [
    { key: 'capacity', label: 'Capacidad Indexada', format: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)} TB` : `${v} GB` },
    { key: 'form_factor', label: 'Factor de Forma Físico' },
    { key: 'pcie_generation', label: 'Protocolo de Conexión', format: (v) => `PCIe Gen ${v}` },
    { key: 'nand_type', label: 'Arquitectura Memorias NAND' },
    { key: 'tbw', label: 'Vida Útil Garantizada (TBW)', format: (v) => `${v} TB` },
    { key: 'energy_per_gb', label: 'Eficiencia de Consumo', format: (v) => `${v} W/GB` },
    // Velocidades teóricas vs reales
    { key: 'read_speed', label: 'Lectura Secuencial Teórica', format: (v) => `${v} MB/s` },
    { key: 'write_speed', label: 'Escritura Secuencial Teórica', format: (v) => `${v} MB/s` },
    { key: 'crystal_disk_read', label: 'CrystalDiskMark (Lectura)', format: (v) => `${v} MB/s` },
    { key: 'crystal_disk_write', format: (v) => `${v} MB/s`, label: 'CrystalDiskMark (Escritura)' },
    { key: 'max_temp_c', label: 'Temperatura Térmica Máxima', format: (v) => `${v} °C` },
  ],
};

// Extractor profundo preparado para navegar objetos anidados mediante puntos (ej. 'usb_ports.usb_c')
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const getProductSpecValue = (product: any, specKey: string): any => {
  // Buscamos a lo largo de las columnas técnicas definidas en la estructura SQL
  const sources = ['specs', 'compatibility', 'benchmarks'];
  
  for (const source of sources) {
    if (product[source]) {
      const parsedSource = typeof product[source] === 'string' 
        ? JSON.parse(product[source]) 
        : product[source];
        
      const val = getNestedValue(parsedSource, specKey);
      if (val !== undefined && val !== null) return val;
    }
  }
  return null;
};