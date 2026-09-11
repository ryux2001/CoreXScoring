import Link from 'next/link';
import { ArrowRight, BarChart3, Boxes, Cpu, Hammer } from 'lucide-react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import { getItemContent, loadPublicHomeData, type HomeCatalogItem, type HomeSection } from '@/lib/admin/home';
import HomeBannerCarousel from './components/home/HomeBannerCarousel';
import HomeCarousel from './components/home/HomeCarousel';
import HomeCollectionCard from './components/home/HomeCollectionCard';
import HomeComparisonCard from './components/home/HomeComparisonCard';
import HomeComponentList from './components/home/HomeComponentList';

interface HomePageProps {
  searchParams: Promise<{ currency?: string }>;
}

function sectionItems(section: HomeSection): HomeCatalogItem[] {
  return section.home_section_items
    .map(getItemContent)
    .filter((item): item is HomeCatalogItem => Boolean(item));
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const currency = await resolveRequestCurrency((await searchParams).currency);
  const { hero, sections } = await loadPublicHomeData(supabase);

  return (
    <main className="min-h-screen bg-black font-technical text-white">
      {hero.is_active && (
        <section className="home-hero border-b border-zinc-900 px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-16 lg:px-16 lg:py-20">
          <div className="home-hero-layout mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <h1 className="home-hero-title font-display text-4xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl">{hero.title}</h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">{hero.description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={hero.primary_href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{hero.primary_label}<ArrowRight aria-hidden="true" size={16} /></Link>
                <Link href={hero.secondary_href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 text-xs font-black uppercase tracking-wider text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{hero.secondary_label}<BarChart3 aria-hidden="true" size={16} /></Link>
              </div>
            </div>
            <div className="hidden md:block"><HomeBannerCarousel /></div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 md:hidden"><HeroTile href="/catalog" icon={Cpu} label="Hardware" /><HeroTile href="/combos" icon={Boxes} label="Combos" /><HeroTile href="/builds" icon={Hammer} label="Builds" /></div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:px-12 md:py-20 lg:px-16">
        <HomeSections sections={sections} currency={currency} />
      </div>
    </main>
  );
}

function HeroTile({ href, icon: Icon, label }: { href: string; icon: typeof Cpu; label: string }) {
  return <Link href={href} className="flex min-h-28 flex-col justify-between bg-zinc-950 p-4 text-zinc-500 transition-colors hover:bg-zinc-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Icon aria-hidden="true" size={18} /><span className="font-display text-sm font-bold uppercase tracking-wider text-zinc-300">{label}</span></Link>;
}

function HomeSections({ sections, currency }: { sections: HomeSection[]; currency: string }) {
  const blocks: ReactNode[] = [];
  let productSections: HomeSection[] = [];

  const flushProductSections = () => {
    if (productSections.length === 0) return;
    blocks.push(
      <div key={`product-group-${productSections[0].id}`} className="grid gap-6 md:grid-cols-2">
        {productSections.map((section) => <HomeComponentList key={section.id} section={section} items={sectionItems(section)} currency={currency} />)}
      </div>,
    );
    productSections = [];
  };

  for (const section of sections) {
    const items = sectionItems(section);
    if (section.content_type === 'products') {
      if (items.length > 0) productSections.push(section);
      continue;
    }
    flushProductSections();

    if ((section.content_type === 'combos' || section.content_type === 'builds') && items.length > 0) {
      const collectionType = section.content_type === 'builds' ? 'builds' : 'combos';
      blocks.push(
        <EditorialSection key={section.id} section={section}>
          <HomeCarousel label={section.title} layout={section.visual_variant === 'spotlight' ? 'spotlight' : 'collection'}>
            {items.map((item) => <HomeCollectionCard key={item.id} item={item} itemType={collectionType} currency={currency} />)}
          </HomeCarousel>
        </EditorialSection>,
      );
      continue;
    }

    if (section.content_type === 'comparisons') {
      const comparisons = section.home_comparisons.filter((comparison) => comparison.is_active && comparison.home_comparison_items.length === 2);
      if (comparisons.length > 0) {
        blocks.push(
          <EditorialSection key={section.id} section={section}>
            <HomeCarousel label={section.title} layout="comparison">{comparisons.map((comparison) => <HomeComparisonCard key={comparison.id} comparison={comparison} currency={currency} />)}</HomeCarousel>
          </EditorialSection>,
        );
      }
    }
  }
  flushProductSections();

  return blocks.length > 0
    ? <div className="space-y-14 sm:space-y-20">{blocks}</div>
    : <div className="py-24 text-center"><h2 className="font-display text-4xl font-black text-white">Próximamente</h2><p className="mt-3 text-zinc-500">Estamos preparando nuevas selecciones de hardware.</p></div>;
}

function EditorialSection({ section, children }: { section: HomeSection; children: ReactNode }) {
  return <section aria-labelledby={`home-section-${section.id}`}>
    <header className="mb-7 flex flex-col gap-3 border-b border-zinc-900 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 id={`home-section-${section.id}`} className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">{section.title}</h2>{section.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{section.description}</p>}</div>
    </header>
    {children}
  </section>;
}
