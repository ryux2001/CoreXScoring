"use client";

import React from "react";
import { COMPONENT_SPECS, getProductSpecValue } from "@/lib/config/specs-mapping";
import { isBuildItem, isComboItem } from "./comparisonUtils";
import type { BuildPartKey, ComboPartKey } from "./comparisonUtils";

interface CompareSpecsTableProps {
  items: any[];
}

interface ComboSpecDefinition {
  part: ComboPartKey | BuildPartKey;
  label: string;
  key: string;
  format?: (value: any) => string;
}

const formatList = (value: any) => Array.isArray(value) ? value.join(" · ") : String(value);

const COMBO_SPECS: ComboSpecDefinition[] = [
  { part: "cpu", label: "CPU · Socket", key: "socket" },
  { part: "cpu", label: "CPU · Núcleos P-Cores", key: "cores" },
  { part: "cpu", label: "CPU · Núcleos E-Cores", key: "efficency_cores" },
  { part: "cpu", label: "CPU · Hilos", key: "threads" },
  { part: "cpu", label: "CPU · Frecuencia Turbo", key: "turbo_frequency", format: (value: any) => `${value} GHz` },
  { part: "cpu", label: "CPU · TDP Base", key: "tdp", format: (value: any) => `${value} W` },
  { part: "cpu", label: "CPU · Consumo Máximo", key: "power_turbo_max", format: (value: any) => `${value} W` },
  { part: "cpu", label: "CPU · Caché L3", key: "cache.l3", format: (value: any) => `${(Number(value) / 1024).toFixed(0)} MB` },
  { part: "gpu", label: "GPU · VRAM", key: "vram_capacity", format: (value: any) => `${value} GB` },
  { part: "gpu", label: "GPU · Tipo de VRAM", key: "vram_type" },
  { part: "gpu", label: "GPU · Bus de memoria", key: "bus_width", format: (value: any) => `${value}-bit` },
  { part: "gpu", label: "GPU · TDP Máximo", key: "tdp", format: (value: any) => `${value} W` },
  { part: "gpu", label: "GPU · Interfaz Bus", key: "pcie_generation", format: (value: any) => `PCIe Gen ${value}` },
  { part: "ram", label: "RAM · Capacidad Total", key: "capacity", format: (value: any) => `${value} GB` },
  { part: "ram", label: "RAM · Configuración Módulos", key: "dual_channel" },
  { part: "ram", label: "RAM · Generación", key: "technology" },
  { part: "ram", label: "RAM · Frecuencia", key: "speed", format: (value: any) => `${value} MHz` },
];

const BUILD_SPECS: ComboSpecDefinition[] = [
  ...COMBO_SPECS,
  { part: "storage", label: "STORAGE · Almacenamiento", key: "capacity", format: (value: any) => Number(value) >= 1000 ? `${Number(value) / 1000} TB` : `${value} GB` },
  { part: "storage", label: "STORAGE · Velocidad lectura", key: "read_speed", format: (value: any) => `${value} MB/s` },
  { part: "storage", label: "STORAGE · Velocidad escritura", key: "write_speed", format: (value: any) => `${value} MB/s` },
  { part: "motherboard", label: "MOTHERBOARD · PCIe", key: "pcie_generation", format: (value: any) => `PCIe Gen ${value}` },
  { part: "motherboard", label: "MOTHERBOARD · Slots SSD", key: "m2_slots", format: formatList },
  { part: "motherboard", label: "MOTHERBOARD · RAM soportada", key: "ram_support", format: formatList },
  { part: "psu", label: "PSU · Certificacion", key: "efficiency" },
  { part: "psu", label: "PSU · Watts", key: "wattage", format: (value: any) => `${value} W` },
];

export default function CompareSpecsTable({ items }: CompareSpecsTableProps) {
  if (items.length === 0) return null;

  if (isComboItem(items[0]) || isBuildItem(items[0])) {
    const isBuild = isBuildItem(items[0]);
    const specs = isBuild ? BUILD_SPECS : COMBO_SPECS;
    const itemTypeLabel = isBuild ? 'Build' : 'Combo';

    return (
      <div className="mt-12 w-full rounded-2xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-sm overflow-x-auto md:overflow-x-visible animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-255 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-12 border-b border-zinc-900 bg-zinc-950/60 px-6 py-4 items-center min-w-[650px] md:min-w-0">
          <div className="col-span-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Especificaciones</span>
          </div>
          <div className="col-span-9 grid grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="truncate pr-2">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tight truncate block">{item.title || item.name}</span>
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mt-0.5">{itemTypeLabel}</span>
              </div>
            ))}
            {Array.from({ length: 3 - items.length }).map((_, index) => <div key={`empty-combo-head-${index}`} className="hidden md:block" />)}
          </div>
        </div>

        <div className="divide-y divide-zinc-900/50">
          {specs.map((spec) => (
            <div key={`${spec.part}-${spec.key}`} className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-zinc-900/10 transition-colors duration-200 group min-w-[650px] md:min-w-0">
              <div className="col-span-3 pr-4">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">{spec.label}</span>
              </div>
              <div className="col-span-9 grid grid-cols-3 gap-6">
                {items.map((item) => {
                  const rawValue = getProductSpecValue(item[spec.part], spec.key);
                  const formattedValue = rawValue !== null && rawValue !== ""
                    ? (spec.format ? spec.format(rawValue) : rawValue)
                    : null;

                  return (
                    <div key={`${item.id}-${spec.part}-${spec.key}`} className="text-left">
                      {formattedValue !== null ? (
                        <span className="text-xs font-medium text-zinc-300 tracking-wide">{formattedValue}</span>
                      ) : (
                        <span className="text-xs font-black text-zinc-700 uppercase tracking-wider select-none">No</span>
                      )}
                    </div>
                  );
                })}
                {Array.from({ length: 3 - items.length }).map((_, index) => <div key={`empty-combo-val-${index}`} className="hidden md:block" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const componentType = items[0]?.type?.toUpperCase();
  const specs = COMPONENT_SPECS[componentType];

  if (!specs) return null;

  return (
    /* 📱 Añadido overflow-x-auto para permitir scroll lateral manteniendo tu max-w-255 */
    <div className="mt-12 w-full rounded-2xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-sm overflow-x-auto md:overflow-x-visible animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-255 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      
      {/* CABECERA DE LA TABLA */}
      {/* 📱 min-w-[650px] asegura que haya espacio suficiente para las columnas en móvil */}
      <div className="grid grid-cols-12 border-b border-zinc-900 bg-zinc-950/60 px-6 py-4 items-center min-w-[650px] md:min-w-0">
        <div className="col-span-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Especificaciones
          </span>
        </div>
        
        <div className="col-span-9 grid grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="truncate pr-2">
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tight truncate block">
                {item.name}
              </span>
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mt-0.5">
                {item.brand}
              </span>
            </div>
          ))}
          {Array.from({ length: 3 - items.length }).map((_, index) => (
            <div key={`empty-head-${index}`} className="hidden md:block" />
          ))}
        </div>
      </div>

      {/* CUERPO DE LA TABLA (FILAS DINÁMICAS) */}
      <div className="divide-y divide-zinc-900/50">
        {specs.map((spec) => (
          /* 📱 Añadido min-w-[650px] a cada fila para alinearse perfectamente con la cabecera */
          <div 
            key={spec.key} 
            className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-zinc-900/10 transition-colors duration-200 group min-w-[650px] md:min-w-0"
          >
            <div className="col-span-3 pr-4">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {spec.label}
              </span>
            </div>

            <div className="col-span-9 grid grid-cols-3 gap-6">
              {items.map((item) => {
                const rawValue = getProductSpecValue(item, spec.key);
                const formattedValue = rawValue !== null && rawValue !== "" 
                  ? (spec.format ? spec.format(rawValue) : rawValue)
                  : null;

                return (
                  <div key={`${item.id}-${spec.key}`} className="text-left">
                    {formattedValue !== null ? (
                      <span className="text-xs font-medium text-zinc-300 tracking-wide">
                        {formattedValue}
                      </span>
                    ) : (
                      <span className="text-xs font-black text-zinc-700 uppercase tracking-wider select-none">
                        No
                      </span>
                    )}
                  </div>
                );
              })}
              
              {Array.from({ length: 3 - items.length }).map((_, index) => (
                <div key={`empty-val-${index}`} className="hidden md:block" />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
