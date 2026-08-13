/**
 * VALIDATIONS
 * Funciones para validar datos antes de procesarlos
 */

// Validar que el producto existe y es un objeto
export const validateProduct = (product: any): boolean => {
  return !!(product && typeof product === 'object');
};

// Validar que los benchmarks existen y son números
export const validateBenchmarks = (benchmarks: any): boolean => {
  if (typeof benchmarks !== 'object' || benchmarks === null) return false;
  return Object.keys(benchmarks).some(key => 
    typeof benchmarks[key] === 'number' && Number.isFinite(benchmarks[key])
  );
};

// Validar que las specs existen y son objetos válidos
export const validateSpecs = (specs: any): boolean => {
  if (typeof specs !== 'object' || specs === null) return false;
  return Object.keys(specs).some(key => 
    typeof specs[key] === 'number' || typeof specs[key] === 'string'
  );
};

// Extraer valor con fallback seguro
export const safeExtract = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return defaultValue;
};

// Extraer array y contar elementos
export const safeArrayLength = (arr: any[]): number => {
  if (Array.isArray(arr)) {
    return arr.length;
  }
  return 0;
};

// Validar que es un array JSONB (de Supabase)
export const isJsonbArray = (value: any): boolean => {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  
  // Verificar que el primer elemento tenga la estructura esperada
  const firstElement = value[0];
  if (typeof firstElement !== 'object' || firstElement === null) return false;
  
  // Verificar que tenga al menos una propiedad
  return Object.keys(firstElement).length > 0;
};
