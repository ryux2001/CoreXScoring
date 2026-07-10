import React from 'react';

interface ComboMainCardProps {
  combo: any;
}

export default function ComboMainCard({ combo }: ComboMainCardProps) {
  // Filtramos para asegurar que solo iteramos sobre las piezas que realmente existen
  const parts = [
    { role: 'CPU', item: combo.cpu },
    { role: 'GPU', item: combo.gpu },
    { role: 'RAM', item: combo.ram },
  ].filter((p) => p.item);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-zinc-900 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-sm lg:p-8">
      
      {/* Título y Categoría del Combo */}
      <div className="mb-8">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {combo.category}
        </span>
        <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tighter text-white leading-snug">
          {combo.title}
        </h1>
      </div>

      <div className="flex flex-col gap-4 mt-auto">
        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 mb-2 pl-1">
          Componentes del Combo
        </h3>
        
        {parts.map((part, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-4 rounded-2xl border border-zinc-900/50 bg-zinc-900/20 p-3.5 transition-colors hover:bg-zinc-900/40 hover:border-zinc-800"
          >
            {/* Contenedor del Icono (Placeholder temporal) */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-900 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
              icon
            </div>
            
            {/* Información de la pieza */}
            <div className="flex flex-col overflow-hidden">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">
                {part.item.brand} · {part.role}
              </span>
              <span className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                {part.item.name}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}