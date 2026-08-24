import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Interfaz para el producto (puedes adaptarla a tu tipo exacto de Supabase)
export interface CompareProduct {
  id: string | number;
  name: string;
  slug: string;
  type: string;
  brand: string; // 🚀 Añade esta línea aquí
  image_url?: string;
  price?: number;
  currency?: string;
  comparisonType?: string;
}

interface CompareState {
  items: CompareProduct[];
  componentType: string | null; // Guarda el tipo bloqueado (ej: 'CPU', 'GPU')
  maxSlots: number;
  evaluatedPrices: Record<string, number>;
  
  // Acciones
  addItem: (product: CompareProduct) => { success: boolean; error?: string };
  removeItem: (productId: string | number) => void;
  setEvaluatedPrice: (productId: string | number, price: number) => void;
  replaceItems: (items: CompareProduct[]) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      componentType: null,
      maxSlots: 3, // Límite inicial de 3 componentes acordado
      evaluatedPrices: {},

      addItem: (product) => {
        const { items, componentType, maxSlots } = get();
        const incomingType = product.type?.toUpperCase();

        // 1. Validar si ya se alcanzó el límite máximo de slots
        if (items.length >= maxSlots) {
          return { 
            success: false, 
            error: `Límite alcanzado. Solo puedes comparar hasta ${maxSlots} productos simultáneamente.` 
          };
        }

        // 2. Validar que el producto no esté ya repetido en la comparativa
        const isAlreadyAdded = items.some((item) => String(item.id) === String(product.id));
        if (isAlreadyAdded) {
          return { success: false, error: "Este producto ya está en la comparativa." };
        }

        // 3. Guardián de tipos: Validar si coincide con el tipo del primer componente agregado
        if (componentType && componentType !== incomingType) {
          return { 
            success: false, 
            error: `No puedes mezclar componentes. Estás comparando ${componentType}, no puedes añadir un(a) ${incomingType}.` 
          };
        }

        // 4. Si todo es correcto, agregar el producto
        // Si es el primero, bloqueamos el almacén con su tipo de componente
        const newType = componentType ? componentType : incomingType;

        set({
          items: [...items, product],
          componentType: newType
        });

        return { success: true };
      },

      removeItem: (productId) => {
        const { items } = get();
        const updatedItems = items.filter((item) => String(item.id) !== String(productId));
        const evaluatedPrices = { ...get().evaluatedPrices };
        delete evaluatedPrices[String(productId)];
        
        // Si ya no quedan productos tras eliminar este, liberamos el candado de tipo
        const newType = updatedItems.length === 0 ? null : get().componentType;

        set({
          items: updatedItems,
          componentType: newType,
          evaluatedPrices,
        });
      },

      setEvaluatedPrice: (productId, price) => {
        if (!Number.isFinite(price) || price < 0) return;
        set((state) => ({
          evaluatedPrices: { ...state.evaluatedPrices, [String(productId)]: price },
        }));
      },

      replaceItems: (items) => {
        const firstItem = items[0];
        const newType = firstItem
          ? String(firstItem.type || '').toUpperCase() || null
          : null;

        set({
          items,
          componentType: newType,
        });
      },

      clearCompare: () => {
        // Reseteo absoluto al estado vacío original
        set({
          items: [],
          componentType: null,
          evaluatedPrices: {},
        });
      },
    }),
    {
      name: 'corex-compare-storage', // Clave única en el localStorage
      partialize: (state) => ({
        items: state.items,
        componentType: state.componentType,
        maxSlots: state.maxSlots,
      }),
    }
  )
);
