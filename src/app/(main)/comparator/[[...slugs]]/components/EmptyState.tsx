"use client";

import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  onOpenModal: () => void;
}

export default function EmptyState({ onOpenModal }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
      <button 
        onClick={onOpenModal}
        className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-dashed border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-white/40 hover:text-white hover:scale-105 transition-all duration-300 shadow-2xl active:scale-95 group"
      >
        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>
      
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mt-6">
        Agregar producto
      </h2>
      <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-1.5 max-w-xs leading-relaxed">
        Comienza una nueva comparativa técnica de hardware indexando tu primer componente.
      </p>
    </div>
  );
}