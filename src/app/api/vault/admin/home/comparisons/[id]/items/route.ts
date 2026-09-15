import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { readLimitedJson } from '@/lib/api-security';
import { getForeignKey, parseHomeCatalogType, validateComparableCatalogItemIds } from '@/lib/admin/home';

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
    body = await readLimitedJson<{ item_type?: unknown; ids?: unknown }>(request, 1 * 1024);
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const itemType = parseHomeCatalogType(body.item_type);
    const ids = body.ids;
    if (!itemType || !Array.isArray(ids) || ids.length !== 2 || ids.some((id) => typeof id !== 'string')) {
      throw new Error('Una comparación destacada debe incluir exactamente dos elementos del mismo tipo.');
    }
    const comparisonId = (await context.params).id;
    const db = getAdminDb();
    const { data: comparison, error: comparisonError } = await db
      .from('home_comparisons')
      .select('item_type')
      .eq('id', comparisonId)
      .maybeSingle();
    if (comparisonError) throw comparisonError;
    if (!comparison || comparison.item_type !== itemType) throw new Error('El tipo de elementos no coincide con esta comparación.');
    await validateComparableCatalogItemIds(db, itemType, ids);
    const { error: deleteError } = await db.from('home_comparison_items').delete().eq('comparison_id', comparisonId);
    if (deleteError) throw deleteError;
    const foreignKey = getForeignKey(itemType);
    const { error: insertError } = await db.from('home_comparison_items').insert(
      ids.map((id, index) => ({ comparison_id: comparisonId, [foreignKey]: id, sort_order: index })),
    );
    if (insertError) throw insertError;
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home comparison items update failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo guardar la comparación.' }, { status: 503 });
  }
}
