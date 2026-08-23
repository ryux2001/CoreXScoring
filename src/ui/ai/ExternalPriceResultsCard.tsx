import type { ExternalPriceSearchResult } from "@/lib/ai/web-search/types";

function formatPrice(price: number | undefined, currency: string | undefined): string {
  if (price === undefined || !currency) return "Precio no detectado";
  return `${price.toFixed(2).replace(".", ",")} ${currency === "EUR" ? "€" : currency}`;
}

function formatEquivalent(value: number | undefined): string | null {
  return value === undefined ? null : `≈ ${value.toFixed(2).replace(".", ",")} €`;
}

interface ExternalPriceResultsCardProps {
  result: ExternalPriceSearchResult;
}

export default function ExternalPriceResultsCard({ result }: ExternalPriceResultsCardProps) {
  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3.5" aria-label="Resultados de búsqueda de precios externos">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold text-cyan-100">Fuentes externas</p>
          <p className="mt-1 text-[10px] text-zinc-500">Consulta del {new Date(result.searchedAt).toLocaleString("es-ES")}</p>
        </div>
        <span className="rounded-full border border-cyan-300/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-cyan-200">
          Solo lectura
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {result.candidates.map((candidate) => (
          <a
            key={candidate.url}
            href={candidate.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block rounded-xl border border-white/[0.08] bg-black/35 p-2.5 transition-colors hover:border-cyan-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-zinc-200">{candidate.retailer}</span>
                <span className="mt-1 block line-clamp-2 text-[10px] leading-relaxed text-zinc-400">{candidate.title}</span>
              </span>
              <span className="shrink-0 text-right text-[11px] font-bold text-cyan-100">
                {formatPrice(candidate.price, candidate.currency)}
                {candidate.currency !== "EUR" && formatEquivalent(candidate.eurEquivalent) && (
                  <span className="mt-1 block text-[10px] font-semibold text-amber-200/80">{formatEquivalent(candidate.eurEquivalent)}</span>
                )}
                <span className="mt-1 block text-[9px] font-normal text-zinc-500">{Math.round(candidate.confidence * 100)}% confianza</span>
              </span>
            </div>
            {candidate.notes.length > 0 && (
              <p className="mt-2 text-[9px] leading-relaxed text-amber-200/75">{candidate.notes.join(" ")}</p>
            )}
          </a>
        ))}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
        Los precios, el stock, el envío y el vendedor pueden cambiar. CoreX no ha modificado ningún precio.
      </p>
    </section>
  );
}
