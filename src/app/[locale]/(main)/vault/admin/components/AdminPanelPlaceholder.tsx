import { Link } from '@/i18n/navigation';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Construction } from 'lucide-react';

interface AdminPanelPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export default function AdminPanelPlaceholder({
  eyebrow,
  title,
  description,
  icon: Icon,
  features,
}: AdminPanelPlaceholderProps) {
  return (
    <main className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/vault"
          className="mb-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          <ArrowLeft aria-hidden="true" size={13} />
          Volver a la bóveda
        </Link>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-8 md:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-200/[0.06] text-cyan-200">
            <Icon aria-hidden="true" size={22} />
          </div>
          <p className="mt-8 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{description}</p>

          <div className="mt-8 rounded-2xl border border-dashed border-zinc-700 bg-black/40 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Construction aria-hidden="true" className="mt-0.5 shrink-0 text-amber-200/80" size={18} />
              <div>
                <h2 className="text-sm font-bold text-zinc-200">Panel preparado para la siguiente fase</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  El acceso ya está disponible para administradores. Las herramientas de este panel todavía no están activas.
                </p>
              </div>
            </div>

            <ul className="mt-5 grid gap-2 border-t border-zinc-800 pt-5 text-xs text-zinc-400 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-200/70" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
