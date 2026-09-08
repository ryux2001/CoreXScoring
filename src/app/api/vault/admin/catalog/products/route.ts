import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser, getCatalogSlots, parseCatalogKind, searchProducts, type CatalogSlot } from '@/lib/admin/catalog';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  const slot = request.nextUrl.searchParams.get('slot');
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const kind = parseCatalogKind(request.nextUrl.searchParams.get('kind') ?? '');

  const typedSlot = slot as CatalogSlot;
  if (!kind || !slot || !getCatalogSlots(kind).includes(typedSlot)) {
    return NextResponse.json({ error: 'Slot de producto no válido.' }, { status: 400 });
  }

  try {
    const products = await searchProducts(getAdminDb(), typedSlot, query);
    return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Admin product search failed', { slot, userId: user.id });
    return NextResponse.json({ error: 'No se pudieron buscar productos.' }, { status: 503 });
  }
}
