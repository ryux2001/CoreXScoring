import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo/metadata";

const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type SlugRow = { slug: string };

async function getSlugs(table: "products" | "combos" | "builds"): Promise<string[]> {
  let query = publicSupabase.from(table).select("slug");
  if (table !== "products") query = query.eq("is_active", true);
  const { data } = await query;
  return ((data ?? []) as SlugRow[]).map((row) => row.slug).filter(Boolean);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productSlugs, comboSlugs, buildSlugs] = await Promise.all([
    getSlugs("products"),
    getSlugs("combos"),
    getSlugs("builds"),
  ]);

  const publicPaths = ["/", "/catalog", "/combos", "/builds", "/privacy", "/terms", "/cookies"];
  const localizedEntries = publicPaths.flatMap((path) => [
    { url: `${SITE_URL}${path}` },
    { url: `${SITE_URL}/es${path === "/" ? "" : path}` },
  ]);
  const detailEntries = [
    ...productSlugs.flatMap((slug) => [
      { url: `${SITE_URL}/catalog/${encodeURIComponent(slug)}` },
      { url: `${SITE_URL}/es/catalog/${encodeURIComponent(slug)}` },
    ]),
    ...comboSlugs.flatMap((slug) => [
      { url: `${SITE_URL}/combos/${encodeURIComponent(slug)}` },
      { url: `${SITE_URL}/es/combos/${encodeURIComponent(slug)}` },
    ]),
    ...buildSlugs.flatMap((slug) => [
      { url: `${SITE_URL}/builds/${encodeURIComponent(slug)}` },
      { url: `${SITE_URL}/es/builds/${encodeURIComponent(slug)}` },
    ]),
  ];

  return [...localizedEntries, ...detailEntries];
}
