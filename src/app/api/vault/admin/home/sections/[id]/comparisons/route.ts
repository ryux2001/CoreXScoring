import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { optionalHomeText, parseHomeCatalogType, requiredHomeText } from '@/lib/admin/home';

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
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const itemType = parseHomeCatalogType(body.item_type);
    if (!itemType) throw new Error('El tipo de comparación no es válido.');
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
      title: requiredHomeText(body.title, 'título', 120),
      description: optionalHomeText(body.description, 'descripción', 360),
      eyebrow: optionalHomeText(body.eyebrow, 'etiqueta', 80),
      item_type: itemType,
      is_active: true,
      sort_order: Number(lastComparison?.sort_order ?? -1) + 1,
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home comparison create failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo crear la comparación.' }, { status: 503 });
  }
}
