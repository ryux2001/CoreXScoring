import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getAdminUser, parseCatalogKind } from '@/lib/admin/catalog';
import { normalizeCategory, toStoredCategory } from '@/lib/admin/catalog-categories';
import { readLimitedJson } from '@/lib/api-security';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ kind: string }> },
) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const kind = parseCatalogKind((await context.params).kind);
  if (!kind) return NextResponse.json({ error: 'Tipo de catálogo no válido.' }, { status: 404 });

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  let body: { scope?: unknown; category?: unknown; ids?: unknown; categories?: unknown };
  try {
    body = await readLimitedJson<typeof body>(request, 64 * 1024);
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  let error;

  if (body.scope === 'categories') {
    if (!Array.isArray(body.categories) || body.categories.some((category) => typeof category !== 'string')) {
      return NextResponse.json({ error: 'El orden de categorías recibido no es válido.' }, { status: 400 });
    }
    ({ error } = await supabase.rpc('reorder_catalog_categories', {
      p_kind: kind,
      p_categories: body.categories.map((category) => toStoredCategory(normalizeCategory(category))),
    }));
  } else if (body.scope === 'items') {
    if (typeof body.category !== 'string' || !Array.isArray(body.ids) || body.ids.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'El orden de tarjetas recibido no es válido.' }, { status: 400 });
    }
    ({ error } = await supabase.rpc('reorder_catalog_items_by_category', {
      p_kind: kind,
      p_category: toStoredCategory(normalizeCategory(body.category)),
      p_ids: body.ids,
    }));
  } else {
    return NextResponse.json({ error: 'Ámbito de orden no válido.' }, { status: 400 });
  }

  if (error) {
    if (error.code === '42501') {
      return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
    }
    if (error.code === '22023') {
      return NextResponse.json({ error: 'La lista cambió. Recarga el catálogo e inténtalo de nuevo.' }, { status: 409 });
    }

    console.error('Admin catalog reorder failed', { kind, userId: user.id, code: error.code || 'unknown' });
    return NextResponse.json({ error: 'No se pudo guardar el orden.' }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
