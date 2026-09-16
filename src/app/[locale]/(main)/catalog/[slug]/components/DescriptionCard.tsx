interface DescriptionCardProps {
  product: {
    description?: unknown;
  };
}

export default function DescriptionCard({ product }: DescriptionCardProps) {
  const t = useTranslations('catalog');
  const description = typeof product.description === "string"
    ? product.description.trim()
    : "";

  return (
    <section className="flex w-full flex-col rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl lg:p-8">
      <h2 className="mb-5 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
        {t('description')}
      </h2>

      <p className="w-full whitespace-pre-line text-[15px] leading-7 text-zinc-300">
        {description || t('descriptionUnavailable')}
      </p>
    </section>
  );
}
import { useTranslations } from 'next-intl';
