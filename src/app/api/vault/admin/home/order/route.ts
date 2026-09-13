import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { readLimitedJson } from '@/lib/api-security';

export const runtime = 'nodejs';

type OrderScope = 'sections' | 'section-items' | 'comparisons' | 'comparison-items';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

function parseScope(value: unknown): OrderScope | null {
  return value === 'sections' || value === 'section-items' || value === 'comparisons' || value === 'comparison-items'
    ? value
    : null;
}

export async function PATCH(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  let body: { scope?: unknown; parent_id?: unknown; ids?: unknown };
  try {
    body = await readLimitedJson<{ scope?: unknown; parent_id?: unknown; ids?: unknown }>(request, 64 * 1024);
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const scope = parseScope(body.scope);
    if (!scope || !Array.isArray(body.ids) || body.ids.some((id) => typeof id !== 'string') || new Set(body.ids).size !== body.ids.length) {
      throw new Error('El orden recibido no es válido.');
    }
    const requiresParent = scope !== 'sections';
    if (requiresParent && (typeof body.parent_id !== 'string' || !body.parent_id)) {
      throw new Error('Falta el contenedor de los elementos a ordenar.');
    }

    const configuration = scope === 'sections'
      ? { table: 'home_sections', parentColumn: null, parentId: null }
      : scope === 'section-items'
        ? { table: 'home_section_items', parentColumn: 'section_id', parentId: body.parent_id as string }
        : scope === 'comparisons'
          ? { table: 'home_comparisons', parentColumn: 'section_id', parentId: body.parent_id as string }
          : { table: 'home_comparison_items', parentColumn: 'comparison_id', parentId: body.parent_id as string };
    const db = getAdminDb();
    let existingQuery = db.from(configuration.table).select('id');
    if (configuration.parentColumn && configuration.parentId) {
      existingQuery = existingQuery.eq(configuration.parentColumn, configuration.parentId);
    }
    const { data: existing, error: existingError } = await existingQuery;
    if (existingError) throw existingError;
    const existingIds = (existing || []).map((item) => item.id as string);
    if (existingIds.length !== body.ids.length || existingIds.some((id) => !body.ids?.includes(id))) {
      throw new Error('La lista cambió. Recarga la página e inténtalo de nuevo.');
    }

    const { error: offsetError } = await db.from(configuration.table).update({ sort_order: 1_000_000 }).in('id', body.ids);
    if (offsetError) throw offsetError;
    const results = await Promise.all(body.ids.map((id, index) => (
      db.from(configuration.table).update({ sort_order: index }).eq('id', id)
    )));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home order update failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo guardar el orden.' }, { status: 503 });
  }
}
