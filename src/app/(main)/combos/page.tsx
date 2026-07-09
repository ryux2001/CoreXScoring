import React from 'react';

interface CombosPageProps {
  searchParams: Promise<{
    currency?: string;
    q?: string;
    type?: string;
  }>;
}

export default async function CombosPage({ searchParams }: CombosPageProps) {
  // En Next.js 15+, searchParams es una promesa que debe resolverse
  const resolvedParams = await searchParams;
  const currency = resolvedParams.currency || 'USD';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-2xl">
        
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-white">
          Página de Combos
        </h1>
        
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Moneda activa:
          </span>
          <span className="text-[11px] font-bold text-emerald-400 tracking-wider">
            {currency}
          </span>
        </div>
        
        <p className="text-xs font-medium text-zinc-600 max-w-sm mt-4">
          Espacio preparado para la implementación del sistema de combos.
        </p>

      </div>
    </div>
  );
}