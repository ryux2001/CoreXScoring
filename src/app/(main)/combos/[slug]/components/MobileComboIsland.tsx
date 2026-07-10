"use client";

import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import ComboMainCard from './ComboMainCard';

interface MobileComboIslandProps {
  combo: any;
}

export default function MobileComboIsland({ combo }: MobileComboIslandProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* OVERLAY OSCURO DEL FONDO */}
      <div 
        className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* LA ISLA DINÁMICA */}
      {/* 🛠️ SOLUCIÓN: Usamos rounded-[22px] (mitad de 44px) para que el salto de forma sea invisible y perfecto */}
      {/* 🛠️ SOLUCIÓN: Cambiamos top-10 por top-16 (más abajo) y reducimos la altura máxima a 380px */}
      <div 
        className={`fixed left-1/2 z-[100] -translate-x-1/2 overflow-hidden border border-zinc-800/80 bg-black/95 shadow-2xl backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen 
            ? 'top-[90px] h-[490px] w-[90vw] max-w-sm rounded-[32px]' // ESTADO EXPANDIDO (Justo para el contenido)
            : 'top-[90px] h-[44px] w-[210px] rounded-[22px]'          // ESTADO CONTRAÍDO (Más abajo y radio matemático exacto)
        }`}
      >
        
        {/* CONTENIDO 1: BOTÓN (Desaparece al abrir) */}
        <button
          onClick={() => setIsOpen(true)}
          className={`absolute inset-0 flex h-full w-full items-center justify-between px-4 transition-all duration-300 cursor-pointer ${
            isOpen 
              ? 'scale-95 opacity-0 pointer-events-none' 
              : 'scale-100 opacity-100 delay-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
              <Layers size={12} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white flex justify-center">
              Ver Piezas
            </span>
          </div>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-400">
            3
          </span>
        </button>

        {/* CONTENIDO 2: TARJETA INTERNA (Aparece al expandirse) */}
        <div 
          className={`absolute inset-0 flex h-full w-full flex-col transition-all duration-300 ${
            isOpen 
              ? 'scale-100 opacity-100 delay-150' 
              : 'scale-95 opacity-0 pointer-events-none'
          }`}
        >
          {/* Botón X superpuesto */}
          <div className="absolute right-4 top-4 z-10">
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 backdrop-blur-md transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer active:scale-95"
            >
              <X size={14} />
            </button>
          </div>

          {/* Tarjeta del Combo (Ajustada al tamaño de la caja) */}
          <div className="h-full w-full overflow-hidden">
             <ComboMainCard combo={combo} />
          </div>
        </div>

      </div>
    </>
  );
}