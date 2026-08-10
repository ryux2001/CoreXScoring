import Link from 'next/link';
import {
  Bookmark,
  Boxes,
  FolderHeart,
  Hammer,
  Layers2,
  UserRound,
} from 'lucide-react';

const vaultSections = [
  {
    title: 'Productos guardados',
    description: 'Consulta los componentes que has guardado en tu bóveda.',
    href: '/vault/products',
    icon: Bookmark,
  },
  {
    title: 'Combos guardados',
    description: 'Revisa tus combinaciones favoritas de CPU, GPU y RAM.',
    href: '/vault/combos',
    icon: FolderHeart,
  },
  {
    title: 'Combos creados',
    description: 'Accede a los combos personalizados que has construido.',
    href: '/vault/combos-created',
    icon: Boxes,
  },
  {
    title: 'Builds guardadas',
    description: 'Encuentra tus presupuestos y configuraciones favoritas.',
    href: '/vault/builds',
    icon: Layers2,
  },
  {
    title: 'Builds creadas',
    description: 'Gestiona las builds completas creadas por ti.',
    href: '/vault/builds-created',
    icon: Hammer,
  },
  {
    title: 'Gestionar cuenta',
    description: 'Administra tu acceso y cambia tu contraseña.',
    href: '/vault/account',
    icon: UserRound,
  },
];

export default function VaultPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-black px-4 py-8 md:px-8 md:py-12 lg:px-12">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-zinc-800/80 bg-zinc-950/40 p-4 shadow-2xl md:p-7">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-5 py-5 md:px-7 md:py-6">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
            Espacio personal
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
            Bóveda
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500 md:text-sm">
            Tu centro de control para organizar productos, combos y builds.
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-3 md:gap-5">
          {vaultSections.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex min-h-[150px] items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/60 md:min-h-[170px] md:gap-4 md:p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-black text-zinc-500 transition-colors group-hover:border-zinc-600 group-hover:text-white md:h-11 md:w-11">
                <Icon size={17} strokeWidth={2} className="md:h-5 md:w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-[11px] font-black uppercase leading-tight tracking-wide text-zinc-200 md:text-xs">
                  {title}
                </h2>
                <p className="mt-3 text-[10px] leading-relaxed text-zinc-600 transition-colors group-hover:text-zinc-400 md:text-[11px]">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
