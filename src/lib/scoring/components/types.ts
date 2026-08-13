/**
 * TYPES
 * Interfaces y tipos para el sistema de scoring
 */

export interface ComponentNotes {
  [key: string]: number;
}

export interface CpuNotes extends ComponentNotes {
  "Potencia": number;
  "Tecnologías": number;
  "Productividad": number;
  "Juegos": number;
  "Eficiencia": number;
  "Calidad precio": number;
}

export interface GpuNotes extends ComponentNotes {
  "Rasterización": number;
  "Ray Tracing": number;
  "Productividad": number;
  "Memoria": number;
  "Eficiencia": number;
  "Software": number;
  "Calidad precio": number;
}

export interface RamNotes extends ComponentNotes {
  "Velocidad": number;
  "Tecnologías": number;
  "Latencia": number;
  "Juegos": number;
  "Productividad": number;
  "Calidad precio": number;
}

export interface StorageNotes extends ComponentNotes {
  "Velocidad": number;
  "Tecnologías": number;
  "Temperaturas": number;
  "Durabilidad": number;
  "Eficiencia": number;
  "Calidad Precio": number;
}

export interface MotherboardNotes extends ComponentNotes {
  "Conectividad": number;
  "Tecnologías": number;
  "Expansión interna": number;
  "Compatibilidad": number;
  "Estabilidad": number;
  "Calidad precio": number;
}

export interface PsuNotes extends ComponentNotes {
  "Estabilidad Eléctrica": number;
  "Conectividad": number;
  "Protecciones": number;
  "Construcción": number;
  "Eficiencia": number;
  "Calidad Precio": number;
}
