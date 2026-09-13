import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  DELETE_CONFIRMATION_TEXT,
  MAX_DELETE_REQUEST_BYTES,
  parseDeleteAccountRequest,
} from '@/lib/auth/delete-account-policy';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
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

  if (!user || user.is_anonymous || !user.email) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
    return NextResponse.json({ error: 'Tipo de contenido no permitido.' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_DELETE_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_DELETE_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
  }

  const body = parseDeleteAccountRequest(rawBody);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });

  if (body.confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION_TEXT) {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400 });
  }

  const { data: reauthenticated, error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: body.password,
  });

  if (reauthenticationError || reauthenticated.user?.id !== user.id) {
    return NextResponse.json({ error: 'No se pudo reautenticar la cuenta.' }, { status: 401 });
  }

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    return NextResponse.json(
      { error: 'No se pudo cerrar la sesión antes de eliminar la cuenta.' },
      { status: 500 },
    );
  }

  const { error: deleteError } = await createSupabaseAdminClient().auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: 'No se pudo eliminar la cuenta.' },
      { status: 500 },
    );
  }

  return response;
}
