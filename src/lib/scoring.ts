/**
 * SISTEMA CENTRAL DE SCORING
 * Este archivo gestiona el cálculo de notas para todos los componentes.
 * Por ahora devuelve valores estáticos (7.5) para facilitar la integración visual.
 */

// Interfaces para tipado (opcional pero recomendado)
export interface ComponentNotes {
  [key: string]: number;
}

// 1. NOTAS PARA CPU
export const getCpuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Potencia": 8.5,
    "Tecnologías": 8.5,
    "Productividad": 7.2,
    "Juegos": 9.5,
    "Eficiencia": 4.5,
    "Calidad precio": 6.5,
  };
};

// 2. NOTAS PARA GPU
export const getGpuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Potencia": 7.5,
    "Tecnologías": 7.5,
    "Productividad": 7.5,
    "Juegos": 7.5,
    "Eficiencia": 7.5,
    "Calidad precio": 7.5,
  };
};

// 3. NOTAS PARA RAM
export const getRamNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Velocidad": 7.5,
    "Tecnologías": 7.5,
    "Latencia": 7.5,
    "Compatibilidad": 7.5,
    "Eficiencia": 7.5,
    "Calidad precio": 7.5,
  };
};

// 4. NOTAS PARA STORAGE (SSD/HDD)
export const getStorageNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Velocidad": 7.5,
    "Tecnologías": 7.5,
    "Temperaturas": 7.5,
    "Durabilidad": 7.5,
    "Eficiencia": 7.5,
    "Calidad Precio": 7.5,
  };
};

// 5. NOTAS PARA MOTHERBOARDS
export const getMotherboardNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Conectividad": 7.5,
    "Tecnologías": 7.5,
    "Construcción": 7.5,
    "Compatibilidad": 7.5,
    "Estabilidad": 7.5,
    "Calidad precio": 7.5,
  };
};

// 6. NOTAS PARA PSU (Fuentes de poder)
export const getPsuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Estabilidad": 7.5,
    "Conectividad": 7.5,
    "Protecciones": 7.5,
    "Construcción": 7.5,
    "Eficiencia": 7.5,
    "Calidad Precio": 7.5,
  };
};

/**
 * FUNCIÓN SELECTORA (Orquestador)
 * Esta es la función que llamaremos desde los componentes.
 */
export const getComponentNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  const type = product?.type?.toUpperCase();

  switch (type) {
    case 'CPU': return getCpuNotes(product, evaluatedPrice);
    case 'GPU': return getGpuNotes(product, evaluatedPrice);
    case 'RAM': return getRamNotes(product, evaluatedPrice);
    case 'STORAGE': return getStorageNotes(product, evaluatedPrice);
    case 'MOTHERBOARD': return getMotherboardNotes(product, evaluatedPrice);
    case 'PSU': return getPsuNotes(product, evaluatedPrice);
    default:
      return {
        "Rendimiento": 7.5,
        "Características": 7.5,
        "Construcción": 7.5,
        "Eficiencia": 7.5,
        "Calidad precio": 7.5,
      };
  }
};