import { getTranslations } from 'next-intl/server';

export default async function loading() {
  const t = await getTranslations('common');
  return (
    <div role="status" aria-live="polite" className="build-page font-technical flex h-screen w-full flex-col items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        {/* Un spinner sencillo con CSS de Tailwind */}
        <div aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-white"></div>
        
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white animate-pulse">
          {t('loading')}
        </p>
      </div>
    </div>
  );
}
