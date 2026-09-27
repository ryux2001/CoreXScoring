import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getAdminDb,
  getAdminUser,
  parseAdminProductPriceUpdates,
} from '@/lib/admin/catalog';
import { readLimitedJson } from '@/lib/api-security';

export const runtime = 'nodejs';

type PriceRequestBody = { updates?: unknown };

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function PUT(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  try {
    const body = await readLimitedJson<PriceRequestBody>(request, 64 * 1024);
    const updates = parseAdminProductPriceUpdates(body?.updates);
    const { data, error } = await getAdminDb().rpc('update_catalog_product_prices', {
      p_admin_user_id: user.id,
      p_updates: updates,
    });

    if (error) throw error;
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Admin product prices update failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudieron guardar los precios.' }, { status: 503 });
  }
}
