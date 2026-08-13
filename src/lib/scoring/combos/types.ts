export interface ComboPrices {
  cpuPrice: number;
  gpuPrice: number;
  ramPrice: number;
  totalPrice: number;
}

export interface ComboScores {
  Potencia: number;
  Productividad: number;
  Gaming: number;
  Eficiencia: number;
  "Cuello Botella": number;
  "Calidad Precio": number;
}

export type ComboPartKey = 'cpu' | 'gpu' | 'ram';
