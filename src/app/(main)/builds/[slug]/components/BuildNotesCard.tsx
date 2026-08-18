import { Info } from 'lucide-react';
import { getBuildNotes, getBuildPartPrice } from '@/lib/scoringBuilds';

interface BuildNotesCardProps {
  build: any;
  currency?: string;
}

const parts = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'];

function getScoreStyles(score: number) {
  if (score > 9) {
    return {
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/30',
      text: 'text-purple-300',
      bar: 'bg-purple-500',
      label: 'text-purple-300',
    };
  }

  if (score > 7) {
    return {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      label: 'text-blue-400',
    };
  }

  if (score > 5) {
    return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: 'text-emerald-400',
    };
  }

  if (score > 3) {
    return {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      label: 'text-yellow-400',
    };
  }

  return {
    border: 'border-red-500/50',
    bg: 'bg-red-950/30',
    text: 'text-red-400',
    bar: 'bg-red-500',
    label: 'text-red-400',
  };
}

export default function BuildNotesCard({
  build,
  currency = 'USD',
}: BuildNotesCardProps) {
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';
  const notes = getBuildNotes(build, currency);
  const buildNotes = [
    { label: 'Potencia', score: notes.potencia },
    { label: 'Productividad', score: notes.productividad },
    { label: 'Gaming', score: notes.gaming },
    { label: 'Eficiencia', score: notes.eficiencia },
    { label: 'Cuello botella', score: notes.cuelloBotella },
    { label: 'Compatibilidad', score: notes.compatibilidad },
    { label: 'Actualizaciones', score: notes.actualizaciones },
    { label: 'Calidad precio', score: notes.calidadPrecio },
  ];
  const totalPrice = parts.reduce((total, part) => {
    return total + getBuildPartPrice(build, part, currency);
  }, 0);

  return (
    <div className="relative z-20 flex h-full flex-col justify-between rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl lg:p-8">
      <div className="relative mb-8">
        <div className="flex min-w-0 flex-wrap items-center gap-4 pr-10">
          <h2 className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            Notas
          </h2>
          <div className="hidden items-center gap-2 rounded-full border border-zinc-900/50 bg-zinc-900/30 px-3 py-1 sm:flex">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-700">
              Precio evaluado:
            </span>
            <span className="text-xs font-black text-zinc-400">
              {isEUR ? `${totalPrice.toFixed(2)}${symbol}` : `${symbol}${totalPrice.toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="group absolute right-0 top-0">
          <button
            type="button"
            aria-label="Información sobre la evaluación provisional"
            className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
          >
            <Info size={11} strokeWidth={3} />
          </button>
          <div className="invisible absolute right-0 top-9 z-[10000] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white">Criterios de Evaluación</div>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 lg:gap-3">
        {buildNotes.map((note) => {
          const styles = getScoreStyles(note.score);

          return (
            <div
              key={note.label}
              className={`group relative flex min-h-[100px] flex-col items-center justify-between rounded-2xl border px-3 py-3 transition-all ${styles.border} ${styles.bg}`}
            >
              <div className="flex h-6 items-center justify-center text-center">
                <p className={`text-[8px] font-black uppercase leading-tight tracking-widest ${styles.label}`}>
                  {note.label}
                </p>
              </div>
              <p className={`font-semibold text-[26px] leading-none tracking-[-0.03em] tabular-nums ${styles.text}`}>
                {note.score.toFixed(1)}
              </p>
              <div className="h-[2px] w-1/2 overflow-hidden rounded-full bg-zinc-900">
                <div className={`h-full ${styles.bar}`} style={{ width: `${note.score * 10}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-zinc-900/20 pt-4">
        <p className="text-center text-[9px] font-bold uppercase leading-tight tracking-widest text-zinc-500 lg:text-left">
          * Datos mockeados pendientes de evaluación dinámica.
        </p>
      </div>
    </div>
  );
}
