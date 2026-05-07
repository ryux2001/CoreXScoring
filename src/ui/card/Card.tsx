import React from 'react';
import { Eye, BarChart2 } from 'lucide-react';

interface ProductProps {
  type: string;
  brand: string;
  name: string;
  price_base: number;
  specs: any;
  compatibility: any;
  release_date: string;
  imageUrl?: string;
}

export const Card = ({ type, brand, name, price_base, specs, compatibility, release_date, imageUrl }: ProductProps) => {
  
  // 1. LÓGICA DE DETECCIÓN DE IMAGEN LOCAL (SSR puro)
  const getLocalImage = () => {
    // Si la marca o el tipo vienen vacíos, evitamos errores
    if (!type || !brand) return null;

    const basePath = '/images/catalog/';
    const t = type.toLowerCase();
    const b = brand.toLowerCase();

    if (t === 'cpu') {
      if (b.includes('intel')) return `${basePath}processor-intel.webp`;
      if (b.includes('amd')) return `${basePath}processor-amd.webp`;
    }

    if (t === 'gpu') {
      if (b.includes('nvidia')) return `${basePath}graphics_card-nvidia.webp`;
      if (b.includes('amd')) return `${basePath}graphics_card-amd.webp`;
      if (b.includes('intel')) return `${basePath}graphics_card-intel.webp`;
    }

    if (t === 'ram') {
      const tech = specs?.technology?.toLowerCase() || '';
      if (tech.includes('ddr4')) return `${basePath}ram-ddr4.webp`;
      if (tech.includes('ddr5')) return `${basePath}ram-ddr5.webp`;
    }

    if (t === 'motherboard') return `${basePath}motherboard.webp`;
    if (t === 'storage') return `${basePath}storage.webp`;
    if (t === 'psu') return `${basePath}psu.webp`;

    return null;
  };

  const finalImageUrl = imageUrl || getLocalImage();

  // 2. Lógica de detalles técnicos
  const getTechnicalDetails = () => {
    const date = new Date(release_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    
    switch (type.toLowerCase()) {
      case 'cpu':
        return [
          { label: 'Socket', value: compatibility?.socket || 'N/A' },
          { label: 'Núcleos/Hilos', value: `${specs?.cores || 0}/${specs?.threads || 0}` },
          { label: 'Lanzamiento', value: date }
        ];
      case 'gpu':
        return [
          { label: 'VRAM', value: `${specs?.vram_capacity || 0}GB ${specs?.vram_type || ''}` },
          { label: 'Bus', value: `${specs?.bus_width || 0}-bit` },
          { label: 'Lanzamiento', value: date }
        ];
      case 'ram':
        return [
          { label: 'Tipo', value: specs?.technology || 'DDR' },
          { label: 'Frecuencia', value: `${specs?.speed || 0}MHz` },
          { label: 'Lanzamiento', value: date }
        ];
      case 'storage':
        return [
          { label: 'Interfaz', value: `PCIe ${compatibility?.pcie_generation || ''}` },
          { label: 'Lectura', value: `${specs?.read_speed || 0}MB/s` },
          { label: 'Lanzamiento', value: date }
        ];
      case 'motherboard':
        return [
          { label: 'Socket', value: compatibility?.socket?.[0] || 'N/A' },
          { label: 'RAM Max', value: compatibility?.ram_support?.[0] || 'DDR5' },
          { label: 'Lanzamiento', value: date }
        ];
      case 'psu':
        return [
          { label: 'Potencia', value: `${specs?.wattage || 0}W` },
          { label: 'Certificación', value: specs?.efficiency || 'N/A' },
          { label: 'Lanzamiento', value: date }
        ];
      default:
        return [{ label: 'Tipo', value: type }, { label: 'Lanzamiento', value: date }];
    }
  };

  const techDetails = getTechnicalDetails();

  return (
    <div className="group flex w-full flex-col bg-black border border-zinc-900 rounded-2xl p-0 overflow-hidden transition-all hover:border-zinc-700 font-sans">
      
      {/* 1. SECCIÓN IMAGEN */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-950 flex items-center justify-center border-b border-zinc-800">
        <span className="absolute left-3 top-3 z-10 rounded-md border border-white bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          {type}
        </span>
        
        {finalImageUrl ? (
          <img 
            src={finalImageUrl} 
            alt={name} 
            className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800" />
             <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-700">No Image Available</span>
          </div>
        )}
      </div>

      {/* 2. CONTENIDO INFERIOR */}
      <div className="flex flex-col p-5 pt-0">
        <div className="mt-5 min-h-[56px]">
          <h3 className="text-lg font-bold tracking-tight text-white line-clamp-2 leading-tight uppercase">
            {name}
          </h3>
        </div>

        <div className="mt-4 space-y-2.5">
          {techDetails.map((detail, index) => (
            <div key={index} className="flex justify-between items-center border-b border-zinc-900/50 pb-1.5">
              <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">{detail.label}</span>
              <span className="text-[11px] text-zinc-300 font-medium">{detail.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <span className="text-2xl font-black text-white tracking-tighter">
            ${Number(price_base).toLocaleString('es-ES')}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 rounded-lg bg-white py-3 text-xs font-bold text-black transition-all hover:bg-zinc-200 cursor-pointer active:scale-95">
            <Eye size={14} strokeWidth={2.5} />
            VER
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 py-3 text-xs font-bold text-zinc-400 transition-all hover:bg-zinc-900 hover:text-white cursor-pointer active:scale-95">
            <BarChart2 size={14} strokeWidth={2.5} />
            COMPARAR
          </button>
        </div>
      </div>
    </div>
  );
};