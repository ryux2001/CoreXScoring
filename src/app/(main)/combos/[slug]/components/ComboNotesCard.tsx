"use client";

import React from 'react';
import { Info } from 'lucide-react';
import { getComboNotes, getComboPartPrice } from '@/lib/scoringCombos';

interface ComboNotesCardProps {
  combo?: any;
  currency?: string;
  onSwitchView?: () => void;
}

export default function ComboNotesCard({ combo, currency = 'USD', onSwitchView }: ComboNotesCardProps) {
  const notes = getComboNotes(combo, currency);

  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';

  // Helper para obtener el precio de un componente respetando custom_price o base_price
  const getPartPrice = (key: string) => {
    return getComboPartPrice(combo, key as 'cpu' | 'gpu' | 'ram', currency, currency);
  };

  // Suma total de los componentes del combo
  const totalPrice = combo
    ? getPartPrice('cpu') +
      getPartPrice('gpu') +
      getPartPrice('ram')
    : 0;

  const formatPrice = (val: number) => {
    return `${!isEUR ? symbol : ''}${Number(val).toLocaleString('es-ES')}${isEUR ? symbol : ''}`;
  };

  // Agrupamos las 6 notas en un único array plano
  const allNotes = [
    { label: 'Potencia', score: notes.Potencia },
    { label: 'Productividad', score: notes.Productividad },
    { label: 'Gaming', score: notes.Gaming },
    { label: 'Eficiencia', score: notes.Eficiencia },
    { label: 'Cuello Botella', score: notes["Cuello Botella"] },
    { label: 'Calidad Precio', score: notes["Calidad Precio"] },
  ];

  // Sistema de colores compartido con NotesCard
  const getColorStyles = (score: number) => {
    if (score > 9) return {
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/30',
      text: 'text-purple-300',
      bar: 'bg-purple-500',
      label: 'text-purple-300'
    };
    if (score > 7) return {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      label: 'text-blue-400'
    };
    if (score > 5) return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: 'text-emerald-400'
    };
    if (score > 3) return {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      label: 'text-yellow-400'
    };
    return {
      border: 'border-red-500/50',
      bg: 'bg-red-950/30',
      text: 'text-red-400',
      bar: 'bg-red-500',
      label: 'text-red-400'
    };
  };

  return (
    <div className="relative z-20 flex flex-col justify-between rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl h-full lg:p-8">
      
      {/* HEADER */}
      <div className="relative mb-8">
        <div className="flex min-w-0 flex-wrap items-center gap-6 pr-28">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 shrink-0">
            Notas
          </h3>
          
          {/* Badge del Precio Evaluado (Suma del combo) */}
          <div className="hidden sm:flex items-center gap-2 whitespace-nowrap bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-900/50">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-700">Precio Evaluado:</span>
            <span className="text-xs font-black text-zinc-400">
               {formatPrice(totalPrice)}
            </span>
            <span className="text-[9px] font-bold text-zinc-800 uppercase ml-1">{currency}</span>
          </div>
        </div>
        
        {/* ACCIONES DE HEADER (INFO + SWAP MÓVIL) */}
        <div className="absolute right-0 top-0 flex items-center gap-3">
          {onSwitchView && (
            <button 
              onClick={onSwitchView}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ver Radar
            </button>
          )}

          <div className="group relative">
            <button
              type="button"
              aria-label="Información sobre los criterios de evaluación"
              className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
            >
              <Info size={11} strokeWidth={3} />
            </button>
            <div className="invisible absolute right-0 top-9 z-[10000] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">Criterios de Evaluación</div>
              <div className="mb-3 space-y-1 text-[10px]">
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" /><span><span className="font-semibold text-purple-300">Morado:</span> Perfecto</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" /><span><span className="font-semibold text-blue-300">Azul:</span> Excelente</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><span><span className="font-semibold text-emerald-300">Verde:</span> Bueno</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-yellow-500" /><span><span className="font-semibold text-yellow-300">Amarillo:</span> Aceptable</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /><span><span className="font-semibold text-red-300">Rojo:</span> Malo</span></div>
              </div>
              <p>La nota es orientativa y no refleja de forma absoluta si un componente es inútil en un aspecto concreto.</p>
              <p className="mt-2">Se calcula mediante fórmulas. Contrasta siempre la información; la decisión final queda a tu criterio.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CUERPO: GRID DINÁMICO (6 Cajas simétricas) */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {allNotes.map((note, idx) => {
          const score = note.score || 0;
          const styles = getColorStyles(score);

          return (
            <div 
              key={idx}
              className={`group relative flex flex-col justify-between items-center py-3 px-3 rounded-2xl border transition-all min-h-[100px] ${styles.border} ${styles.bg}`}
            >
              {/* Título de la nota */}
              <div className="flex h-6 items-center justify-center text-center">
                <p className={`text-[8px] font-black uppercase tracking-widest leading-tight ${styles.label}`}>
                  {note.label}
                </p>
              </div>

              {/* Valor numérico */}
              <div className="text-center">
                <p className={`font-semibold text-[26px] leading-none tracking-[-0.03em] tabular-nums ${styles.text}`}>
                  {score.toFixed(1)}
                </p>
              </div>

              {/* Barra de progreso */}
              <div className="w-1/2 h-[2px] bg-zinc-900 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-1000 ${styles.bar}`} 
                   style={{ width: `${score * 10}%` }} 
                 />
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-zinc-900/20">
        <p className="text-[9px] font-bold uppercase tracking-widest leading-tight text-zinc-500 text-center lg:text-left">
          * Todas las evaluaciones se basan en el rendimiento relativo frente a la competencia.
        </p>
      </div>

    </div>
  );
}
