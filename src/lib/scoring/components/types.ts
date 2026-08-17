/**
 * TYPES
 * Interfaces y tipos para el sistema de scoring
 */

export interface ComponentNotes {
  [key: string]: number;
}

export interface CpuTechnicalNotes extends ComponentNotes {
  "Potencia": number;
  "Productividad": number;
  Gaming: number;
  "Eficiencia": number;
  "Plataforma": number;
}

export interface CpuNotes extends CpuTechnicalNotes {
  "Calidad precio": number;
}

export interface GpuTechnicalNotes extends ComponentNotes {
  "Rasterización": number;
  "Productividad": number;
  Gaming: number;
  "Eficiencia": number;
  "Tecnologías": number;
}

export interface GpuNotes extends GpuTechnicalNotes {
  "Calidad precio": number;
}

export interface RamNotes extends ComponentNotes {
  "Velocidad": number;
  "Tecnologías": number;
  "Latencia": number;
  Gaming: number;
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
