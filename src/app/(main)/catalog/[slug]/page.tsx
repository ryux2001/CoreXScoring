import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  // Desenvolvemos el ID de los parámetros
  const { slug } = await params;

  // Consultamos el nombre del producto para testear
  const { data: product, error } = await supabase
    .from("products")
    .select("name")
    .eq("slug", slug)
    .single();

  if (error || !product) {
    notFound(); // Muestra la página 404 si el ID no existe
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
          {product.name}
        </h1>
        <p className="mt-4 text-zinc-500 text-sm tracking-widest uppercase">
          SLUG del producto: {slug}
        </p>
      </div>
    </main>
  );
}