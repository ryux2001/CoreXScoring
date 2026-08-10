import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CONFIRMATION_TEXT = 'ELIMINAR';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  let body: { confirmation?: string } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  if (body.confirmation?.trim().toUpperCase() !== CONFIRMATION_TEXT) {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: 'sb-auth-token' },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });
  }

  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminKey) {
    return NextResponse.json(
      { error: 'La eliminación de cuentas no está configurada en el servidor.' },
      { status: 500 },
    );
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    adminKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    return NextResponse.json(
      { error: 'No se pudo cerrar la sesión antes de eliminar la cuenta.' },
      { status: 500 },
    );
  }

  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: 'No se pudo eliminar la cuenta.' },
      { status: 500 },
    );
  }

  return response;
}
