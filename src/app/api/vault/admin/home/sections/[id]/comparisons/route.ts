import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { readLimitedJson } from '@/lib/api-security';
import { parseHomeCatalogType, parseHomeEditorialTranslations, saveHomeEditorialTranslations } from '@/lib/admin/home';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await readLimitedJson<Record<string, unknown>>(request, 4 * 1024);
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const itemType = parseHomeCatalogType(body.item_type);
    if (!itemType) throw new Error('El tipo de comparación no es válido.');
    const translations = parseHomeEditorialTranslations(body.translations);
    const sectionId = (await context.params).id;
    const db = getAdminDb();
    const [{ data: section, error: sectionError }, { data: lastComparison, error: orderError }] = await Promise.all([
      db.from('home_sections').select('content_type').eq('id', sectionId).maybeSingle(),
      db.from('home_comparisons').select('sort_order').eq('section_id', sectionId).order('sort_order', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (sectionError) throw sectionError;
    if (orderError) throw orderError;
    if (!section || section.content_type !== 'comparisons') throw new Error('La sección no admite comparaciones.');
    const { data, error } = await db.from('home_comparisons').insert({
      section_id: sectionId,
      title: translations.en.title,
      description: translations.en.description,
      eyebrow: translations.en.eyebrow,
      item_type: itemType,
       is_active: false,
      sort_order: Number(lastComparison?.sort_order ?? -1) + 1,
    }).select('id').single();
    if (error) throw error;
    await saveHomeEditorialTranslations(db, 'home_comparison_translations', 'comparison_id', data.id, translations);
    return NextResponse.json({ id: data.id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home comparison create failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo crear la comparación.' }, { status: 503 });
  }
}
