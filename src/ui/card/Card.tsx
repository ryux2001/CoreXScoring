"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Eye } from "lucide-react"; // Importamos Bookmark
import { Link, useRouter } from "@/i18n/navigation";
import CompareButton from "./CompareButton";
import { supabase } from "@/lib/supabaseClient";
import { formatReleaseDate } from "@/lib/formatReleaseDate";
import { getProductImage } from "@/lib/catalog/product-images";
import { useLocale, useTranslations } from 'next-intl';

interface ProductProps {
  id: string; // Añadimos el ID
  slug: string;
  type: string;
  brand: string;
  name: string;
  price: number;
  priceSource?: 'current' | 'msrp' | 'unavailable';
  showMsrpBadge?: boolean;
  currency: string;
  specs: any;
  compatibility: any;
  release_date?: string | null;
  imageUrl?: string;
  wholeCardClickable?: boolean;
}

export const Card = ({
  id,
  slug,
  type,
  brand,
  name,
  price,
  priceSource,
  showMsrpBadge = false,
  currency,
  specs,
  compatibility,
  release_date,
  imageUrl,
  wholeCardClickable = false,
}: ProductProps) => {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSavedState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("saved_products")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("product_id", id)
        .maybeSingle();

      if (isMounted && !error) {
        setIsSaved(Boolean(data));
      }
    };

    void loadSavedState();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSave = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isSaving) return;

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      if (isSaved) {
        const { error } = await supabase
          .from("saved_products")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", id);

        if (error) throw error;
        setIsSaved(false);
      } else {
        const { error } = await supabase
          .from("saved_products")
          .insert({ user_id: user.id, product_id: id });

        if (error) throw error;
        setIsSaved(true);
      }
    } catch (error) {
      console.error("No se pudo actualizar el producto guardado", error);
    } finally {
      setIsSaving(false);
    }
  };

  const finalImageUrl = imageUrl || getProductImage({ type, brand, specs });

  const getTechnicalDetails = () => {
    const date = formatReleaseDate(release_date, locale, t('releaseUnavailable'));
    switch (type.toLowerCase()) {
      case "cpu":
        return [
          { label: t('socket'), value: compatibility?.socket || "N/A" },
          {
            label: t("coresThreads"),
            value: `${specs?.cores || 0}/${specs?.threads || 0}`,
          },
          { label: t('release'), value: date },
        ];
      case "gpu":
        return [
          {
            label: "VRAM",
            value: `${specs?.vram_capacity || 0}GB ${specs?.vram_type || ""}`,
          },
          { label: t('bus'), value: `${specs?.bus_width || 0}-bit` },
          { label: t('release'), value: date },
        ];
      case "ram":
        return [
          { label: t('type'), value: specs?.technology || "DDR" },
          { label: t('frequency'), value: `${specs?.speed || 0}MHz` },
          { label: t('release'), value: date },
        ];
      case "storage":
        return [
          {
            label: t('interface'),
            value: `PCIe ${compatibility?.pcie_generation || ""}`,
          },
          { label: t('readSpeed'), value: `${specs?.read_speed || 0}MB/s` },
          { label: t('release'), value: date },
        ];
      case "motherboard":
        return [
          { label: t('socket'), value: compatibility?.socket?.[0] || "N/A" },
          {
            label: t('maxRam'),
            value: compatibility?.ram_support?.[0] || "DDR5",
          },
          { label: t('release'), value: date },
        ];
      case "psu":
        return [
          { label: t('wattage'), value: `${specs?.wattage || 0}W` },
          { label: t('efficiency'), value: specs?.efficiency || "N/A" },
          { label: t('release'), value: date },
        ];
      default:
        return [
          { label: t('type'), value: type },
          { label: t('release'), value: date },
        ];
    }
  };

  const techDetails = getTechnicalDetails();
  const currencySymbol = currency === "EUR" ? "€" : "$";

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!wholeCardClickable && !window.matchMedia("(max-width: 639px)").matches) return;

    const target = event.target as HTMLElement;
    if (target.closest("button")) return;

    router.push(`/catalog/${slug}?currency=${currency}`);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!wholeCardClickable && !window.matchMedia("(max-width: 639px)").matches) return;
    if ((event.target as HTMLElement).closest("button")) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    router.push(`/catalog/${slug}?currency=${currency}`);
  };

  return (
    <div
      className={`group flex min-w-0 w-full max-w-[100%] md:max-w-[400px] lg:max-w-[330px] cursor-pointer flex-row overflow-hidden rounded-2xl border border-zinc-900 bg-black p-0 font-technical transition-all hover:border-zinc-700 ${wholeCardClickable ? "sm:flex-col" : "sm:cursor-default sm:flex-col"}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={wholeCardClickable ? "link" : undefined}
      tabIndex={0}
    >
      <div className="relative flex min-h-[180px] w-[42%] shrink-0 items-center justify-center overflow-hidden border-r border-zinc-800 bg-zinc-950 sm:aspect-square sm:min-h-0 sm:h-60 sm:w-full sm:border-r-0 sm:border-b">
        <span className="font-display absolute left-3 top-3 z-10 rounded-md border border-zinc-600 bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
          {type}
        </span>

        {finalImageUrl ? (
          <img
            src={finalImageUrl}
            alt={name}
            className="absolute inset-0 h-full w-full object-contain opacity-80 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800" />
            <span className="font-technical text-[10px] uppercase tracking-[0.2em] text-zinc-700">
              {t('imageUnavailable')}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5 sm:pt-0 sm:max-h-75">
        <div className="min-h-[34px] sm:mt-5 sm:min-h-[36px]">
          <h3 className="font-display line-clamp-2 text-base font-bold uppercase leading-tight tracking-tight text-white sm:text-lg">
            {name}
          </h3>
        </div>

        <div className="mt-2 space-y-1.5 sm:mt-2 sm:space-y-2.5">
          {techDetails.map((detail, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-zinc-900/50 pb-1 sm:pb-1"
            >
              <span className="font-technical text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-[11px]">
                {detail.label}
              </span>
              <span className="font-technical text-[11px] font-medium text-zinc-300 sm:text-xs">
                {detail.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-baseline gap-2 sm:mt-3">
          <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {currencySymbol}
            {Number(price).toLocaleString(locale)}
          </span>
          {showMsrpBadge && priceSource === 'msrp' ? (
            <span className="rounded border border-zinc-800 px-1.5 py-0.5 font-technical text-[8px] font-black uppercase tracking-widest text-zinc-500">
              MSRP
            </span>
          ) : null}
        </div>

        {/* FOOTER DE LA CARD ACTUALIZADO */}
        <div className="mt-3 flex min-w-0 gap-1 sm:mt-3 sm:gap-2">
          {!wholeCardClickable && (
            <Link
              href={`/catalog/${slug}?currency=${currency}`}
              className="font-display hidden w-19 flex-none items-center justify-center gap-2 rounded-lg bg-white py-3 text-xs font-bold text-black transition-all hover:bg-zinc-200 active:scale-95 sm:flex"
            >
              <Eye size={14} strokeWidth={2.5} />
              {t('view')}
            </Link>
          )}
          <div className="flex min-w-0 flex-1">
            <CompareButton
              id={id}
              slug={slug}
              type={type}
              brand={brand}
              name={name}
              price={price}
              currency={currency}
              specs={specs}
              compatibility={compatibility}
              release_date={release_date}
            />
          </div>

          {/* Nuevo Botón de Guardar (Solo icono) */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-label={isSaved ? t('removeSaved') : t('saveProduct')}
            title={isSaved ? t('removeSaved') : t('saveProduct')}
            className={`flex shrink-0 items-center justify-center rounded-lg border px-2 py-2 transition-all hover:bg-zinc-900 hover:text-white cursor-pointer active:scale-95 disabled:cursor-wait disabled:opacity-60 sm:px-3 sm:py-3 ${
              isSaved
                ? "border-white bg-zinc-900 text-white"
                : "border-zinc-800 text-zinc-400"
            }`}
          >
            <Bookmark size={14} strokeWidth={2.5} fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
};
