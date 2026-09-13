import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildCatalogMutation,
  ensureCatalogCategoryOrder,
  getAdminDb,
  getAdminUser,
  parseCatalogKind,
  type CatalogMutationPayload,
} from '@/lib/admin/catalog';
import { readLimitedJson } from '@/lib/api-security';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(
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

  let body: CatalogMutationPayload;
  try {
    body = await readLimitedJson<CatalogMutationPayload>(request, 64 * 1024);
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const payload = await buildCatalogMutation(db, kind, body);
    const { data, error } = await db.from(kind).insert(payload).select('id').single();

    if (error) throw error;
    await ensureCatalogCategoryOrder(db, kind, String(payload.category));

    return NextResponse.json({ id: data.id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Admin catalog create failed', { kind, userId: user.id });
    return NextResponse.json({ error: 'No se pudo crear el registro.' }, { status: 503 });
  }
}
