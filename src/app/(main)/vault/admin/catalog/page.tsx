import Link from 'next/link';
import { ArrowRight, Boxes, Hammer, Home, Settings2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getAdminDb, getAdminUser, loadCatalogCounts } from '@/lib/admin/catalog';

export default async function AdminCatalogPage() {
  const user = await getAdminUser();

  if (!user) redirect('/auth');

  const counts = await loadCatalogCounts(getAdminDb());

  return (
    <main className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/vault"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          <Settings2 aria-hidden="true" size={13} />
          Volver a la bóveda
        </Link>

        <header className="mt-6 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">Administración / Catálogo</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white md:text-5xl">Gestión de catálogo</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">
            Edita las configuraciones predeterminadas que aparecen en el catálogo público sin tocar la base de datos manualmente.
          </p>
        </header>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <CatalogTypeCard
            href="/vault/admin/catalog/home"
            title="Inicio"
            description="Banner, listas editoriales y comparaciones recomendadas de la página principal."
            count={null}
            icon={Home}
            accent="amber"
          />
          <CatalogTypeCard
            href="/vault/admin/catalog/builds"
            title="Builds"
            description="Configuraciones completas con CPU, GPU, RAM, placa base, almacenamiento y fuente."
            count={counts.builds}
            icon={Hammer}
            accent="cyan"
          />
          <CatalogTypeCard
            href="/vault/admin/catalog/combos"
            title="Combos"
            description="Combinaciones predeterminadas de CPU, GPU y RAM listas para comparar."
            count={counts.combos}
            icon={Boxes}
            accent="violet"
          />
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          Los cambios se guardan directamente en Supabase y se reflejan en el catálogo después de actualizar la página.
        </p>
      </div>
    </main>
  );
}

function CatalogTypeCard({
  href,
  title,
  description,
  count,
  icon: Icon,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  count: number | null;
  icon: LucideIcon;
  accent: 'cyan' | 'violet' | 'amber';
}) {
  const colors = accent === 'cyan'
    ? 'border-cyan-200/20 bg-cyan-200/[0.04] text-cyan-200 group-hover:border-cyan-200/45'
    : accent === 'violet'
      ? 'border-violet-200/20 bg-violet-200/[0.04] text-violet-200 group-hover:border-violet-200/45'
      : 'border-amber-200/20 bg-amber-200/[0.04] text-amber-200 group-hover:border-amber-200/45';

  return (
    <Link
      href={href}
      className={`group rounded-3xl border p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 md:p-8 ${colors}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-current/20 bg-black/30">
          <Icon aria-hidden="true" size={23} />
        </div>
        {count !== null && <span className="font-display text-3xl font-black text-white">{count}</span>}
      </div>
      <h2 className="mt-10 font-display text-2xl font-black text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">{description}</p>
      <span className="mt-7 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors group-hover:text-white">
        Gestionar {title.toLowerCase()}
        <ArrowRight aria-hidden="true" size={14} />
      </span>
    </Link>
  );
}
