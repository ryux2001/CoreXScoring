import React from 'react'
import { supabase } from '@/lib/supabaseClient'

export default async function CatalogPage() {
  const {data: products, error} = await supabase
    .from("products")
    .select("id, name")
  
  if(error) {
    return <p className="text-red-500">Error cargando productos: {error.message}</p>;
  }
  return (
    <>
      <main>
        <h1>Catalgo</h1>
        {products?.map((product)=>(
          <p key={product.id}>
            {product.name}
          </p>
        ))}
      </main>
    </>
  )
}
