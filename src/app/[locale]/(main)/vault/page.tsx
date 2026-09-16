import { Link } from '@/i18n/navigation';
import {
  Activity,
  Bookmark,
  Boxes,
  FolderHeart,
  Hammer,
  Layers2,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getTranslations } from 'next-intl/server';

export default async function VaultPage() {
  const t = await getTranslations('vault');
  const vaultSections = [
    { title: t('sections.products.title'), description: t('sections.products.description'), href: '/vault/products', icon: Bookmark },
    { title: t('sections.combos.title'), description: t('sections.combos.description'), href: '/vault/combos', icon: FolderHeart },
    { title: t('sections.createdCombos.title'), description: t('sections.createdCombos.description'), href: '/vault/combos-created', icon: Boxes },
    { title: t('sections.builds.title'), description: t('sections.builds.description'), href: '/vault/builds', icon: Layers2 },
    { title: t('sections.createdBuilds.title'), description: t('sections.createdBuilds.description'), href: '/vault/builds-created', icon: Hammer },
    { title: t('sections.account.title'), description: t('sections.account.description'), href: '/vault/account', icon: UserRound },
  ];
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sections = user?.app_metadata?.role === 'admin'
    ? [
      ...vaultSections,
      {
          title: t('sections.adminAi.title'),
          description: t('sections.adminAi.description'),
        href: '/vault/admin/ai',
        icon: ShieldCheck,
      },
      {
          title: t('sections.adminMonitoring.title'),
          description: t('sections.adminMonitoring.description'),
        href: '/vault/admin/monitoring',
        icon: Activity,
      },
      {
          title: t('sections.adminCatalog.title'),
          description: t('sections.adminCatalog.description'),
        href: '/vault/admin/catalog',
        icon: Settings2,
      },
    ]
    : vaultSections;

  return (
    <main className="vault-page font-technical min-h-[calc(100vh-4rem)] bg-black px-2 py-8 sm:p4 md:px-8 md:py-12 lg:px-12">
      <div className="mx-auto max-w-5xl rounded-[2rem] py-4 px-2 sm:p-4 shadow-2xl md:p-7">
        <header className="rounded-2xl px-2 py-5 md:px-7 md:py-6">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            {t('eyebrow')}
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500 md:text-sm">
            {t('description')}
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-3 md:gap-5">
          {sections.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group grid min-h-[150px] grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 gap-y-0 rounded-2xl border border-zinc-900 bg-zinc-900/20 p-4 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/60 md:flex md:min-h-[170px] md:gap-4 md:px-5 md:py-8"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-black text-zinc-500 transition-colors group-hover:border-zinc-600 group-hover:text-white md:h-11 md:w-11">
                <Icon size={17} strokeWidth={2} className="md:h-5 md:w-5" />
              </div>
              <div className="contents min-w-0 md:block md:flex-1">
                <h2 className="pt-0.5 text-[14px] font-extrabold uppercase leading-tight tracking-wide text-zinc-200">
                  {title}
                </h2>
                <p className="col-span-2 mt-3 pt-0.5 text-[11px] leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-300 md:text-[12px]">
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
