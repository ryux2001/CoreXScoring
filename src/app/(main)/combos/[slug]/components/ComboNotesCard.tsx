"use client";

import React from 'react';

interface ComboNotesCardProps {
  combo?: any; 
  currency?: string;
}

export default function ComboNotesCard({ combo, currency }: ComboNotesCardProps) {
  // 🛑 DATOS MOCKEADOS (Temporales)
  const mockTechnicalNotes = [
    { label: 'Potencia', score: 8.7 },
    { label: 'Productividad', score: 7.4 },
    { label: 'Gaming', score: 9.2 },
    { label: 'Eficiencia', score: 5.5 },
    { label: 'Cuello Botella', score: 9.0 }, // 🚀 Nueva métrica añadida
  ];
  const mockCalidadPrecio = 8.9;

  const getColorStyles = (score: number) => {
    if (score >= 7)
      return {
        border: "border-emerald-500/30",
        bg: "bg-emerald-950/20",
        text: "text-emerald-400",
        label: "text-emerald-500/70",
        bar: "bg-emerald-500",
      };
    if (score >= 3)
      return {
        border: "border-yellow-500/30",
        bg: "bg-yellow-950/20",
        text: "text-yellow-400",
        label: "text-yellow-500/70",
        bar: "bg-yellow-500",
      };
    return {
      border: "border-red-500/30",
      bg: "bg-red-950/20",
      text: "text-red-400",
      label: "text-red-500/70",
      bar: "bg-red-500",
    };
  };

  const cpStyles = getColorStyles(mockCalidadPrecio);

  return (
    <div className="flex h-full flex-col justify-center rounded-3xl border border-zinc-900 bg-zinc-950/40 p-5 shadow-2xl backdrop-blur-sm lg:p-7">
      
      {/* Cabecera */}
      <div className="mb-5 text-left">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
          Rendimiento Estimado
        </h2>
        <p className="mt-1 text-[9px] font-medium uppercase tracking-widest text-zinc-600">
          Evaluación combinada del ensamble
        </p>
      </div>

      {/* 🚀 GRID MAESTRO: Actualizado a 7 columnas en PC */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-5">
        
        {/* 5 Notas Técnicas */}
        {mockTechnicalNotes.map((note, index) => {
          const styles = getColorStyles(note.score);
          
          // Truco responsivo: Si es la última nota impar (Cuello Botella) en móvil, 
          // le damos 2 columnas de ancho para que no quede un hueco. En PC vuelve a 1.
          const isLastOddItem = index === mockTechnicalNotes.length - 1;
          const colSpanClass = isLastOddItem ? "col-span-2 md:col-span-1" : "col-span-1";

          return (
            <div 
              key={note.label} 
              className={`flex flex-col items-center justify-between rounded-2xl border p-3 transition-colors min-h-[105px] ${colSpanClass} ${styles.border} ${styles.bg}`}
            >
              {/* Título centrado */}
              <div className="text-center h-8 flex items-center justify-center">
                <span className={`text-[7.5px] 2xl:text-[8.5px] font-black uppercase tracking-[0.15em] line-clamp-1 ${styles.label}`}>
                  {note.label}
                </span>
              </div>

              {/* Número real */}
              <div className="text-center my-1">
                <span className={`text-2xl 2xl:text-3xl font-black tracking-tighter ${styles.text}`}>
                  {note.score.toFixed(1)}
                </span>
              </div>

              {/* Barra proporcional */}
              <div className="w-1/2 h-[2px] bg-zinc-900/60 rounded-full overflow-hidden mt-1">
                 <div 
                   className={`h-full transition-all duration-1000 ${styles.bar}`} 
                   style={{ width: `${note.score * 10}%` }} 
                 />
              </div>
            </div>
          );
        })}

        {/* Nota Calidad / Precio (Doble Ancho: 2 columnas de las 7) */}
        <div className={`col-span-2 flex flex-col items-center justify-between rounded-2xl border p-3 transition-colors min-h-[105px] ${cpStyles.border} ${cpStyles.bg}`}>
          
          {/* Título apilado y centrado */}
          <div className="text-center h-8 flex flex-col items-center justify-center">
            <span className={`text-[7px] 2xl:text-[8px] font-black uppercase tracking-[0.2em] leading-none ${cpStyles.label}`}>
              EVALUACIÓN GLOBAL
            </span>
            <span className="mt-1 text-[10px] 2xl:text-xs font-bold uppercase tracking-widest text-zinc-200 leading-none">
              Calidad Precio
            </span>
          </div>
          
          {/* Número real */}
          <div className="text-center my-1">
             <span className={`text-2xl 2xl:text-3xl font-black tracking-tighter ${cpStyles.text}`}>
               {mockCalidadPrecio.toFixed(1)}
             </span>
          </div>

          {/* Barra proporcional */}
          <div className="w-1/3 h-[2px] bg-zinc-900/60 rounded-full overflow-hidden mt-1">
             <div 
               className={`h-full transition-all duration-1000 ${cpStyles.bar}`} 
               style={{ width: `${mockCalidadPrecio * 10}%` }} 
             />
          </div>

        </div>

      </div>

    </div>
  );
}