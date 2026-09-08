import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildCatalogMutation,
  getAdminDb,
  getAdminUser,
  parseCatalogKind,
  type CatalogMutationPayload,
} from '@/lib/admin/catalog';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

async function getRouteContext(context: { params: Promise<{ kind: string; id: string }> }) {
  const params = await context.params;
  return { kind: parseCatalogKind(params.kind), id: params.id };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const { kind, id } = await getRouteContext(context);
  if (!kind || !id) return NextResponse.json({ error: 'Registro no válido.' }, { status: 404 });

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  let body: CatalogMutationPayload;
  try {
    body = await request.json() as CatalogMutationPayload;
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const payload = await buildCatalogMutation(db, kind, body, id);
    const { data, error } = await db
      .from(kind)
      .update(payload)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });

    return NextResponse.json({ id: data.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Admin catalog update failed', { kind, id, userId: user.id });
    return NextResponse.json({ error: 'No se pudo actualizar el registro.' }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const { kind, id } = await getRouteContext(context);
  if (!kind || !id) return NextResponse.json({ error: 'Registro no válido.' }, { status: 404 });

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  try {
    const { data, error } = await getAdminDb()
      .from(kind)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });

    return NextResponse.json({ id: data.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin catalog delete failed', {
      kind,
      id,
      userId: user.id,
      code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo eliminar el registro. Puedes ocultarlo desde su estado.' }, { status: 409 });
  }
}
