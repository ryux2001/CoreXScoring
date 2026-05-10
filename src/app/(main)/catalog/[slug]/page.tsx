import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import MainInfoCard from "./components/MainInfoCard";
import PriceCustomCard from "./components/PriceCustomCard";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // Traemos TODOS los datos del producto
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          
          {/* COLUMNA IZQUIERDA (3/12) */}
          <div className="lg:col-span-3 lg:sticky lg:top-8 h-fit">
            <MainInfoCard product={product} />
          </div>

          {/* COLUMNA DERECHA (9/12) - Contenedor de las Islas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:col-span-9">
            
            {/* FILA 1: ASIMÉTRICA */}
            {/* Precio: Ocupa 5 de 12 (Más estrecha) */}
            <div className="lg:col-span-5">
              <PriceCustomCard product={product} />
            </div>

            {/* Notas: Ocupa 7 de 12 (Más ancha) */}
            <div className="lg:col-span-7 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 flex items-center justify-center min-h-[300px]">
               <span className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Aquí irá: Notas</span>
            </div>

            {/* FILA 2: SIMÉTRICA (50/50) */}
            {/* Radar Chart: Ocupa 6 de 12 */}
            <div className="lg:col-span-6 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 flex items-center justify-center min-h-[400px]">
               <span className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Aquí irá: Radar Chart</span>
            </div>

            {/* Benchmarks: Ocupa 6 de 12 */}
            <div className="lg:col-span-6 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 flex items-center justify-center min-h-[400px]">
               <span className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Aquí irá: Benchmarks</span>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
