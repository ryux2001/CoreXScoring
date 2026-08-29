"use client";

import { create } from "zustand";
import { calculateCatalogPriceEvaluation, type CatalogPriceEvaluation, type CatalogPriceEvaluationInput } from "@/lib/catalog/price-evaluation";

type ApplyCatalogPriceInput = CatalogPriceEvaluationInput;

interface CatalogPriceEvaluationState {
  current: CatalogPriceEvaluation | null;
  initialize: (input: ApplyCatalogPriceInput) => void;
  apply: (input: ApplyCatalogPriceInput) => CatalogPriceEvaluation | null;
  applyServerEvaluation: (evaluation: CatalogPriceEvaluation) => void;
  clear: (productId?: string) => void;
}

function createEvaluation(input: ApplyCatalogPriceInput): CatalogPriceEvaluation | null {
  return calculateCatalogPriceEvaluation(input);
}

export const useCatalogPriceEvaluationStore = create<CatalogPriceEvaluationState>((set, get) => ({
  current: null,
  initialize: (input) => {
    const current = get().current;
    if (current?.productId === input.productId && current.currency === input.currency) return;
    const evaluation = createEvaluation(input);
    if (evaluation) set({ current: evaluation });
  },
  apply: (input) => {
    const evaluation = createEvaluation(input);
    if (evaluation) set({ current: evaluation });
    return evaluation;
  },
  applyServerEvaluation: (evaluation) => {
    if (!evaluation || !evaluation.productId) return;
    set({ current: { ...evaluation, updatedAt: evaluation.updatedAt || Date.now() } });
  },
  clear: (productId) => {
    const current = get().current;
    if (!productId || current?.productId === productId) set({ current: null });
  },
}));
