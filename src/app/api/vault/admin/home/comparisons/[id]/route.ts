import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { readLimitedJson } from '@/lib/api-security';
import { optionalHomeText, requiredHomeText } from '@/lib/admin/home';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await readLimitedJson<Record<string, unknown>>(request, 64 * 1024);
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    if (typeof body.is_active !== 'boolean') throw new Error('El estado de publicación no es válido.');
    const { error } = await getAdminDb().from('home_comparisons').update({
      title: requiredHomeText(body.title, 'título', 120),
      description: optionalHomeText(body.description, 'descripción', 360),
      eyebrow: optionalHomeText(body.eyebrow, 'etiqueta', 80),
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', (await context.params).id);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home comparison update failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo guardar la comparación.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
  const { error } = await getAdminDb().from('home_comparisons').delete().eq('id', (await context.params).id);
  if (error) {
    console.error('Admin home comparison delete failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo eliminar la comparación.' }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
