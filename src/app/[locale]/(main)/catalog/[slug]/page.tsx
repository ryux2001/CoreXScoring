import { supabase } from "@/lib/supabaseClient";
import { resolveRequestCurrency } from "@/lib/serverCurrency";
import { notFound } from "next/navigation";
import MainInfoCard from "./components/MainInfoCard";
import PriceCustomCard from "./components/PriceCustomCard";
import NotesCard from "./components/NotesCard";
import RadarChartCard from "./components/RadarChartCard";
import MobileEvaluationWrapper from "./components/MobileEvaluationWrapper"; // IMPORTAMOS EL WRAPPER MÓVIL
import BenchmarksCard from "./components/BenchmarksCard";
import DescriptionCard from "./components/DescriptionCard";
import GpuFpsCard from "./components/GpuFpsCard";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ currency?: string }>;
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const currency = await resolveRequestCurrency(resolvedSearchParams.currency);

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !product) {
    notFound();
  }

  const isGpu = String(product.type ?? "").toUpperCase() === "GPU";
  let games: Array<{ id: string; name: string; gpu_fps_base?: unknown }> = [];

  if (isGpu) {
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, name, gpu_fps_base");

    games = gamesData ?? [];
  }

  return (
    <main className="catalog-detail font-technical min-h-screen bg-black p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          
          {/* COLUMNA IZQUIERDA (Fija en Escritorio) */}
          <div className="lg:col-span-3 lg:sticky lg:top-8 h-fit">
            <MainInfoCard product={product} currency={currency} />
          </div>

          {/* COLUMNA DERECHA (Contenedor de las Islas) */}
          <div className="catalog-detail-right grid grid-cols-1 gap-6 lg:col-span-9 lg:grid-cols-12">
            
            {/* --- SECCIÓN PRECIO (Siempre visible en su cuadrante) --- */}
            <div className="catalog-detail-price lg:col-span-4">
              <PriceCustomCard product={product} currency={currency} />
            </div>

            {/* --- VISTA ESCRITORIO (hidden lg:block) --- */}
            {/* Notas (Fila 1) */}
            <div className="catalog-detail-notes hidden lg:col-span-8 lg:block">
               <NotesCard product={product} currency={currency} />
            </div>

            {/* Radar Chart (Fila 2 - Proporción 35% de ancho) */}
            <div className="hidden lg:block lg:col-span-5">
               <RadarChartCard product={product} currency={currency} />
            </div>


            {/* --- VISTA MÓVIL UNIFICADA (block lg:hidden) --- */}
            {/* El Wrapper sustituye a ambos componentes en móvil y controla cuál mostrar ocupando el espacio de forma limpia */}
            <div className="block lg:hidden">
              <MobileEvaluationWrapper product={product} currency={currency} />
            </div>


            {/* --- SECCIÓN BENCHMARKS (Siempre visible debajo de las evaluaciones) --- */}
            {/* Ocupa todo el ancho en móvil, y el 65% (8 columnas) en escritorio al lado del radar */}
            <div className="lg:col-span-7">
               <BenchmarksCard product={product} />
            </div>

            {isGpu && (
              <div className="catalog-detail-fps lg:col-span-7">
                <GpuFpsCard product={product} games={games} />
              </div>
            )}

            {/* --- SECCIÓN DESCRIPCIÓN (Última isla en móvil) --- */}
            <div className={`catalog-detail-description ${isGpu ? "lg:col-span-5" : "lg:col-span-12"}`}>
              <DescriptionCard product={product} />
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
