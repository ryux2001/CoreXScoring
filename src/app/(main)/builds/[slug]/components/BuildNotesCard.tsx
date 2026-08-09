import { Info } from 'lucide-react';

interface BuildNotesCardProps {
  build: any;
  currency?: string;
}

const mockNotes = [
  { label: 'Potencia', score: 8.6 },
  { label: 'Productividad', score: 8.1 },
  { label: 'Gaming', score: 8.9 },
  { label: 'Eficiencia', score: 7.8 },
  { label: 'Cuello botella', score: 9.1 },
  { label: 'Calidad precio', score: 8.4 },
];

const parts = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'];

function getScoreStyles(score: number) {
  if (score >= 9) {
    return {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      label: 'text-blue-500/70',
    };
  }

  if (score >= 7) {
    return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: 'text-emerald-500/70',
    };
  }

  if (score >= 3) {
    return {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      label: 'text-yellow-500/70',
    };
  }

  return {
    border: 'border-red-500/50',
    bg: 'bg-red-950/30',
    text: 'text-red-400',
    bar: 'bg-red-500',
    label: 'text-red-500/70',
  };
}

export default function BuildNotesCard({
  build,
  currency = 'USD',
}: BuildNotesCardProps) {
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';
  const totalPrice = parts.reduce((total, part) => {
    const product = build?.[part];
    const price = isEUR ? product?.price_base_eur : product?.price_base_usd;
    return total + (Number(price) || 0);
  }, 0);

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
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

        <div className="group relative">
          <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:text-white">
            <Info size={11} strokeWidth={3} />
          </div>
          <div className="invisible absolute right-0 top-7 z-[10000] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white">
              Evaluación provisional
            </div>
            <p>Estas notas son datos de referencia y serán reemplazadas por notas dinámicas.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {mockNotes.map((note) => {
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
              <p className={`text-[26px] font-black tracking-tighter ${styles.text}`}>
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
        <p className="text-center text-[8px] font-bold uppercase leading-tight tracking-widest text-zinc-500 lg:text-left">
          * Datos mockeados pendientes de evaluación dinámica.
        </p>
      </div>
    </div>
  );
}
