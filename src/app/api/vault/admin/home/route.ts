import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { homeHref, requiredHomeText } from '@/lib/admin/home';
import { readLimitedJson } from '@/lib/api-security';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function PATCH(request: NextRequest) {
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
    if (typeof body.is_active !== 'boolean') throw new Error('El estado de visibilidad no es válido.');
    const payload = {
      id: true,
      eyebrow: requiredHomeText(body.eyebrow, 'etiqueta', 80),
      title: requiredHomeText(body.title, 'título', 160),
      description: requiredHomeText(body.description, 'descripción', 480),
      primary_label: requiredHomeText(body.primary_label, 'texto de acción principal', 80),
      primary_href: homeHref(body.primary_href, 'ruta principal'),
      secondary_label: requiredHomeText(body.secondary_label, 'texto de acción secundaria', 80),
      secondary_href: homeHref(body.secondary_href, 'ruta secundaria'),
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    };
    const { error } = await getAdminDb().from('home_hero').upsert(payload);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home hero update failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo guardar el banner.' }, { status: 503 });
  }
}
