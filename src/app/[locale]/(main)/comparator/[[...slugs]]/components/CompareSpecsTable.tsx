"use client";

import React from "react";
import { COMPONENT_SPECS, getProductSpecValue } from "@/lib/config/specs-mapping";
import { getCatalogDetailLabelKey } from "@/lib/catalog/presentation";
import { isBuildItem, isComboItem } from "./comparisonUtils";
import type { BuildPartKey, ComboPartKey } from "./comparisonUtils";
import { useTranslations } from "next-intl";
import type { CompareProduct } from "@/store/useCompareStore";

interface CompareSpecsTableProps {
  items: CompareProduct[];
}

interface ComboSpecDefinition {
  part: ComboPartKey | BuildPartKey;
  labelKey: string;
  key: string;
  format?: (value: unknown) => string;
}

const formatList = (value: unknown) => Array.isArray(value) ? value.join(" · ") : String(value);

const COMBO_SPECS: ComboSpecDefinition[] = [
  { part: "cpu", labelKey: "specs.cpu.socket", key: "socket" },
  { part: "cpu", labelKey: "specs.cpu.cores", key: "cores" },
  { part: "cpu", labelKey: "specs.cpu.efficiencyCores", key: "efficency_cores" },
  { part: "cpu", labelKey: "specs.cpu.threads", key: "threads" },
  { part: "cpu", labelKey: "specs.cpu.turboFrequency", key: "turbo_frequency", format: (value: unknown) => `${value} GHz` },
  { part: "cpu", labelKey: "specs.cpu.baseTdp", key: "tdp", format: (value: unknown) => `${value} W` },
  { part: "cpu", labelKey: "specs.cpu.maxPower", key: "power_turbo_max", format: (value: unknown) => `${value} W` },
  { part: "cpu", labelKey: "specs.cpu.cacheL3", key: "cache.l3", format: (value: unknown) => `${(Number(value) / 1024).toFixed(0)} MB` },
  { part: "gpu", labelKey: "specs.gpu.vram", key: "vram_capacity", format: (value: unknown) => `${value} GB` },
  { part: "gpu", labelKey: "specs.gpu.vramType", key: "vram_type" },
  { part: "gpu", labelKey: "specs.gpu.memoryBus", key: "bus_width", format: (value: unknown) => `${value}-bit` },
  { part: "gpu", labelKey: "specs.gpu.maxTdp", key: "tdp", format: (value: unknown) => `${value} W` },
  { part: "gpu", labelKey: "specs.gpu.busInterface", key: "pcie_generation", format: (value: unknown) => `PCIe Gen ${value}` },
  { part: "ram", labelKey: "specs.ram.capacity", key: "capacity", format: (value: unknown) => `${value} GB` },
  { part: "ram", labelKey: "specs.ram.modules", key: "dual_channel" },
  { part: "ram", labelKey: "specs.ram.generation", key: "technology" },
  { part: "ram", labelKey: "specs.ram.frequency", key: "speed", format: (value: unknown) => `${value} MHz` },
];

const BUILD_SPECS: ComboSpecDefinition[] = [
  ...COMBO_SPECS,
  { part: "storage", labelKey: "specs.storage.capacity", key: "capacity", format: (value: unknown) => Number(value) >= 1000 ? `${Number(value) / 1000} TB` : `${value} GB` },
  { part: "storage", labelKey: "specs.storage.readSpeed", key: "read_speed", format: (value: unknown) => `${value} MB/s` },
  { part: "storage", labelKey: "specs.storage.writeSpeed", key: "write_speed", format: (value: unknown) => `${value} MB/s` },
  { part: "motherboard", labelKey: "specs.motherboard.pcie", key: "pcie_generation", format: (value: unknown) => `PCIe Gen ${value}` },
  { part: "motherboard", labelKey: "specs.motherboard.m2Slots", key: "m2_slots", format: formatList },
  { part: "motherboard", labelKey: "specs.motherboard.ramSupport", key: "ram_support", format: formatList },
  { part: "psu", labelKey: "specs.psu.efficiency", key: "efficiency" },
  { part: "psu", labelKey: "specs.psu.wattage", key: "wattage", format: (value: unknown) => `${value} W` },
];

interface SpecsTableHeaderProps {
  items: CompareSpecsTableProps["items"];
  headerContentRef: React.RefObject<HTMLDivElement | null>;
  variant: "component" | "combo" | "build";
}

function SpecsTableHeader({ items, headerContentRef, variant }: SpecsTableHeaderProps) {
  const t = useTranslations("comparator");
  const isCollection = variant !== "component";
  const itemTypeLabel = variant === "build" ? t("buildFallback") : t("comboFallback");

  return (
    <div className="pointer-events-none sticky top-[4.25rem] lg:top-[5rem] z-20 w-full overflow-hidden border-b border-zinc-900 bg-zinc-950">
      <div
        ref={headerContentRef}
        className="grid grid-cols-12 px-6 py-4 items-center min-w-[650px] md:min-w-0"
        style={{ willChange: "transform" }}
      >
        <div className="col-span-3">
          <span className="text-[11px] font-black font-display uppercase tracking-[0.5px] text-zinc-500">
            {t("specifications")}
          </span>
        </div>

        <div className="col-span-9 grid grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="truncate pr-2">
              <span className="text-[10px] font-bold font-display text-zinc-300 uppercase tracking-normal truncate block">
                {isCollection
                  ? String((item as unknown as Record<string, unknown>).title || item.name)
                  : item.name}
              </span>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mt-0.5">
                {isCollection ? itemTypeLabel : item.brand}
              </span>
            </div>
          ))}
          {Array.from({ length: 3 - items.length }).map((_, index) => (
            <div key={`empty-head-${variant}-${index}`} className="hidden md:block" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CompareSpecsTable({ items }: CompareSpecsTableProps) {
  const t = useTranslations("comparator");
  const tCatalog = useTranslations("catalog");
  const headerContentRef = React.useRef<HTMLDivElement>(null);

  const getSpecLabel = (spec: ComboSpecDefinition | { key: string }) => (
    "labelKey" in spec
      ? t(spec.labelKey)
      : tCatalog(getCatalogDetailLabelKey(spec.key))
  );

  const formatSpecValue = (value: unknown, spec: ComboSpecDefinition | { format?: (raw: unknown) => string }): string | number => {
    if (typeof value === "boolean") return t(value ? "yes" : "no");
    const formatted = "format" in spec && spec.format ? spec.format(value) : value;
    return typeof formatted === "string" || typeof formatted === "number"
      ? formatted
      : String(formatted ?? "");
  };

  const syncHeaderScroll = (event: React.UIEvent<HTMLDivElement>) => {
    headerContentRef.current?.style.setProperty(
      "transform",
      `translate3d(${-event.currentTarget.scrollLeft}px, 0, 0)`,
    );
  };

  if (items.length === 0) return null;

  if (isComboItem(items[0]) || isBuildItem(items[0])) {
    const isBuild = isBuildItem(items[0]);
    const specs = isBuild ? BUILD_SPECS : COMBO_SPECS;

    return (
      <div className="mt-12 w-full rounded-2xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-255">
        <SpecsTableHeader
          items={items}
          headerContentRef={headerContentRef}
          variant={isBuild ? "build" : "combo"}
        />

        <div onScroll={syncHeaderScroll} className="overflow-x-auto md:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="divide-y divide-zinc-900/50">
            {specs.map((spec) => (
              <div key={`${spec.part}-${spec.key}`} className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-zinc-900/10 transition-colors duration-200 group min-w-[650px] md:min-w-0">
                <div className="col-span-3 pr-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">{getSpecLabel(spec)}</span>
                </div>
                <div className="col-span-9 grid grid-cols-3 gap-6">
                  {items.map((item) => {
                    const rawValue = getProductSpecValue((item as unknown as Record<string, unknown>)[spec.part], spec.key);
                    const formattedValue = rawValue !== null && rawValue !== ""
                      ? formatSpecValue(rawValue, spec)
                      : null;

                    return (
                      <div key={`${item.id}-${spec.part}-${spec.key}`} className="text-left">
                        {formattedValue !== null ? (
                          <span className="text-[12px] font-medium text-zinc-300 tracking-wide">{formattedValue}</span>
                        ) : (
                          <span className="text-xs font-black text-zinc-700 uppercase tracking-wider select-none">{t("notAvailable")}</span>
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
      </div>
    );
  }

  const componentType = items[0]?.type?.toUpperCase();
  const specs = COMPONENT_SPECS[componentType];

  if (!specs) return null;

  return (
    <div className="mt-12 w-full rounded-2xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-255">
      <SpecsTableHeader
        items={items}
        headerContentRef={headerContentRef}
        variant="component"
      />

      {/* CUERPO DE LA TABLA (FILAS DINÁMICAS) */}
      <div onScroll={syncHeaderScroll} className="overflow-x-auto md:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="divide-y divide-zinc-900/50">
          {specs.map((spec) => (
            <div
              key={spec.key}
              className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-zinc-900/10 transition-colors duration-200 group min-w-[650px] md:min-w-0"
            >
              <div className="col-span-3 pr-4">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  {tCatalog(getCatalogDetailLabelKey(spec.key))}
                </span>
              </div>

              <div className="col-span-9 grid grid-cols-3 gap-6">
                {items.map((item) => {
                  const rawValue = getProductSpecValue(item, spec.key);
                    const formattedValue = rawValue !== null && rawValue !== ""
                      ? formatSpecValue(rawValue, spec)
                      : null;

                  return (
                    <div key={`${item.id}-${spec.key}`} className="text-left">
                      {formattedValue !== null ? (
                        <span className="text-[12px] font-medium text-zinc-300 tracking-wide">
                          {formattedValue}
                        </span>
                      ) : (
                        <span className="text-xs font-black text-zinc-700 uppercase tracking-wider select-none">
                          {t("notAvailable")}
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

    </div>
  );
}
