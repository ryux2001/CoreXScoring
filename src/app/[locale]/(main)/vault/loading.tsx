import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('common');
  return (
    <div className="vault-page font-technical flex h-screen w-full flex-col items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        {/* Un spinner sencillo con CSS de Tailwind */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-white"></div>
        
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white animate-pulse">
          {t('loading')}
        </p>
      </div>
    </div>
  );
}
