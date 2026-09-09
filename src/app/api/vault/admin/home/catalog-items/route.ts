import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { getCatalogTable, parseHomeCatalogType } from '@/lib/admin/home';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
  const itemType = parseHomeCatalogType(request.nextUrl.searchParams.get('type'));
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (!itemType) return NextResponse.json({ error: 'El tipo de elemento no es válido.' }, { status: 400 });

  const db = getAdminDb();
  let requestQuery = itemType === 'products'
    ? db.from('products').select('id,slug,name,brand,type').order('name', { ascending: true }).limit(12)
    : db.from(getCatalogTable(itemType)).select('id,slug,title,category,is_active').eq('is_active', true).order('title', { ascending: true }).limit(12);
  if (query) requestQuery = requestQuery.ilike(itemType === 'products' ? 'name' : 'title', `%${query}%`);
  const { data, error } = await requestQuery;
  if (error) {
    console.error('Admin home catalog search failed', { userId: user.id, itemType });
    return NextResponse.json({ error: 'No se pudieron buscar elementos.' }, { status: 503 });
  }
  return NextResponse.json({ items: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}
