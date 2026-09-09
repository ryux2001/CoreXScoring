import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { optionalHomeText, parseHomeContentType, requiredHomeText } from '@/lib/admin/home';

export const runtime = 'nodejs';

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  try {
    const contentType = parseHomeContentType(body.content_type);
    if (!contentType) throw new Error('El tipo de sección no es válido.');
    const db = getAdminDb();
    const { data: lastSection, error: orderError } = await db
      .from('home_sections')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderError) throw orderError;

    const { data, error } = await db.from('home_sections').insert({
      title: requiredHomeText(body.title, 'título', 120),
      description: optionalHomeText(body.description, 'descripción', 360),
      eyebrow: optionalHomeText(body.eyebrow, 'etiqueta', 80),
      content_type: contentType,
      visual_variant: 'default',
      is_active: true,
      sort_order: Number(lastSection?.sort_order ?? -1) + 1,
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin home section create failed', { userId: user.id });
    return NextResponse.json({ error: 'No se pudo crear la sección.' }, { status: 503 });
  }
}
