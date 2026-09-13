import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { readLimitedJson } from '@/lib/api-security';
import { getForeignKey, parseHomeCatalogType, validateCatalogItemIds } from '@/lib/admin/home';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  let body: { item_type?: unknown; ids?: unknown };
  try {
    body = await readLimitedJson<{ item_type?: unknown; ids?: unknown }>(request, 64 * 1024);
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const itemType = parseHomeCatalogType(body.item_type);
    const ids = body.ids;
    if (!itemType || !Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new Error('Los elementos recibidos no son válidos.');
    }
    const sectionId = (await context.params).id;
    const db = getAdminDb();
    const { data: section, error: sectionError } = await db
      .from('home_sections')
      .select('content_type')
      .eq('id', sectionId)
      .maybeSingle();
    if (sectionError) throw sectionError;
    if (!section || section.content_type !== itemType) {
      throw new Error('El tipo de elementos no coincide con esta sección.');
    }
    await validateCatalogItemIds(db, itemType, ids);
    const { error: deleteError } = await db.from('home_section_items').delete().eq('section_id', sectionId);
    if (deleteError) throw deleteError;
    if (ids.length > 0) {
      const foreignKey = getForeignKey(itemType);
      const { error: insertError } = await db.from('home_section_items').insert(
        ids.map((id, index) => ({ section_id: sectionId, [foreignKey]: id, sort_order: index })),
      );
      if (insertError) throw insertError;
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home section items update failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo guardar la lista de la sección.' }, { status: 503 });
  }
}
