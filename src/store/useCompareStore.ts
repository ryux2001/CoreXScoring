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
  evaluatedPartPrices?: Record<string, number>;
}

export type CompareError =
  | { code: 'maxSlots'; maxSlots: number }
  | { code: 'duplicate' }
  | { code: 'mixed'; currentType: string; incomingType: string }
  | { code: 'mixedSnapshot' };

export type CompareResult = { success: true } | { success: false; error: CompareError };

function getAllowedPartKeys(item: CompareProduct): string[] {
  const type = item.comparisonType || String(item.type || '').toLowerCase();
  if (type === 'combo' || String(item.type || '').toUpperCase() === 'COMBO') return ['cpu', 'gpu', 'ram'];
  if (type === 'build' || String(item.type || '').toUpperCase() === 'BUILD') return ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'];
  return [];
}

interface CompareState {
  items: CompareProduct[];
  componentType: string | null; // Guarda el tipo bloqueado (ej: 'CPU', 'GPU')
  maxSlots: number;
  evaluatedPrices: Record<string, number>;
  evaluatedPartPrices: Record<string, Record<string, number>>;
  
  // Acciones
  addItem: (product: CompareProduct) => CompareResult;
  removeItem: (productId: string | number) => void;
  setEvaluatedPrice: (productId: string | number, price: number) => void;
  setEvaluatedPartPrices: (itemId: string | number, prices: Record<string, number>) => void;
  replaceItems: (items: CompareProduct[]) => void;
  applyComparisonSnapshot: (
    items: CompareProduct[],
    evaluatedPrices: Record<string, number>,
    evaluatedPartPrices?: Record<string, Record<string, number>>,
  ) => CompareResult;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      componentType: null,
      maxSlots: 3, // Límite inicial de 3 componentes acordado
      evaluatedPrices: {},
      evaluatedPartPrices: {},

      addItem: (product) => {
        const { items, componentType, maxSlots } = get();
        const incomingType = product.type?.toUpperCase();

        // 1. Validar si ya se alcanzó el límite máximo de slots
        if (items.length >= maxSlots) {
          return { 
            success: false, 
            error: { code: 'maxSlots', maxSlots },
          };
        }

        // 2. Validar que el producto no esté ya repetido en la comparativa
        const isAlreadyAdded = items.some((item) => String(item.id) === String(product.id));
        if (isAlreadyAdded) {
          return { success: false, error: { code: 'duplicate' } };
        }

        // 3. Guardián de tipos: Validar si coincide con el tipo del primer componente agregado
        if (componentType && componentType !== incomingType) {
          return { 
            success: false, 
            error: { code: 'mixed', currentType: componentType, incomingType },
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
        const evaluatedPartPrices = { ...get().evaluatedPartPrices };
        delete evaluatedPartPrices[String(productId)];
        
        // Si ya no quedan productos tras eliminar este, liberamos el candado de tipo
        const newType = updatedItems.length === 0 ? null : get().componentType;

        set({
          items: updatedItems,
          componentType: newType,
          evaluatedPrices,
          evaluatedPartPrices,
        });
      },

      setEvaluatedPrice: (productId, price) => {
        if (!Number.isFinite(price) || price < 0) return;
        set((state) => ({
          evaluatedPrices: { ...state.evaluatedPrices, [String(productId)]: price },
        }));
      },

      setEvaluatedPartPrices: (itemId, prices) => {
        const item = get().items.find((candidate) => String(candidate.id) === String(itemId));
        if (!item) return;
        const allowedParts = new Set(getAllowedPartKeys(item));
        const validPrices = Object.fromEntries(
          Object.entries(prices).filter(([part, price]) => allowedParts.has(part) && Number.isFinite(price) && price >= 0),
        );
        set((state) => ({
          evaluatedPartPrices: {
            ...state.evaluatedPartPrices,
            [String(itemId)]: validPrices,
          },
        }));
      },

      replaceItems: (items) => {
        const { maxSlots, evaluatedPartPrices } = get();
        if (items.length > maxSlots) return;
        const ids = items.map((item) => String(item.id));
        if (new Set(ids).size !== ids.length) return;
        const types = new Set(items.map((item) => String(item.type || '').toUpperCase()).filter(Boolean));
        if (types.size > 1) return;
        const firstItem = items[0];
        const newType = firstItem
          ? String(firstItem.type || '').toUpperCase() || null
          : null;

        set({
          items,
          componentType: newType,
          evaluatedPartPrices: Object.fromEntries(
            Object.entries(evaluatedPartPrices).flatMap(([id, prices]) => {
              const item = items.find((candidate) => String(candidate.id) === id);
              if (!item) return [];
              const allowedParts = new Set(getAllowedPartKeys(item));
              const validPrices = Object.fromEntries(Object.entries(prices).filter(([part, price]) => allowedParts.has(part) && Number.isFinite(price) && price >= 0));
              return Object.keys(validPrices).length > 0 ? [[id, validPrices]] : [];
            }),
          ),
        });
      },

      applyComparisonSnapshot: (items, evaluatedPrices, evaluatedPartPrices = {}) => {
        const { maxSlots } = get();
        if (items.length > maxSlots) {
          return { success: false, error: { code: 'maxSlots', maxSlots } };
        }

        const ids = items.map((item) => String(item.id));
        if (new Set(ids).size !== ids.length) {
          return { success: false, error: { code: 'duplicate' } };
        }

        const types = new Set(items.map((item) => String(item.type || "").toUpperCase()).filter(Boolean));
        if (types.size > 1) {
          return { success: false, error: { code: 'mixedSnapshot' } };
        }

        const validIds = new Set(ids);
        const validPrices = Object.fromEntries(
          Object.entries(evaluatedPrices).filter(([id, price]) => validIds.has(id) && Number.isFinite(price) && price >= 0),
        );

        set({
          items,
          componentType: types.values().next().value || null,
          evaluatedPrices: validPrices,
          evaluatedPartPrices: Object.fromEntries(
            Object.entries(evaluatedPartPrices).flatMap(([id, prices]) => {
              const item = items.find((candidate) => String(candidate.id) === id);
              if (!validIds.has(id) || !item || prices === null || typeof prices !== 'object') return [];
              const allowedParts = new Set(getAllowedPartKeys(item));
              const validPrices = Object.fromEntries(Object.entries(prices).filter(([part, price]) => allowedParts.has(part) && Number.isFinite(price) && price >= 0));
              return Object.keys(validPrices).length > 0 ? [[id, validPrices]] : [];
            }),
          ),
        });
        return { success: true };
      },

      clearCompare: () => {
        // Reseteo absoluto al estado vacío original
        set({
          items: [],
          componentType: null,
          evaluatedPrices: {},
          evaluatedPartPrices: {},
        });
      },
    }),
    {
      name: 'corex-compare-storage', // Clave única en el localStorage
      partialize: (state) => ({
        items: state.items,
        componentType: state.componentType,
        maxSlots: state.maxSlots,
        evaluatedPartPrices: state.evaluatedPartPrices,
      }),
    }
  )
);
