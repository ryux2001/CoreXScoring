"use client";

import { create } from "zustand";
import type { AiFrontendPriceContext } from "@/lib/ai/types";

interface AiVisiblePriceState {
  context: AiFrontendPriceContext | null;
  setContext: (context: AiFrontendPriceContext) => void;
  clear: () => void;
}

/** Contexto efímero de precios para editores de builds y combos sin guardar. */
export const useAiVisiblePriceStore = create<AiVisiblePriceState>((set) => ({
  context: null,
  setContext: (context) => set({ context }),
  clear: () => set({ context: null }),
}));
