interface DescriptionCardProps {
  product: {
    description?: unknown;
  };
}

export default function DescriptionCard({ product }: DescriptionCardProps) {
  const description = typeof product.description === "string"
    ? product.description.trim()
    : "";

  return (
    <section className="flex w-full flex-col rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl lg:p-8">
      <h2 className="mb-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
        Descripción
      </h2>

      <p className="w-full whitespace-pre-line text-sm leading-7 text-zinc-300">
        {description || "No hay una descripción disponible para este componente."}
      </p>
    </section>
  );
}
