import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          storage: {
  getItem: (key: string) => {
    return cookieStore.get(key)?.value ?? null;
  },
  // Añadimos el '?' en options para que sea opcional
  setItem: (key: string, value: string, options?: any) => {
    cookieStore.set(key, value, options);
  },
  // Añadimos el '?' en options para que sea opcional
  removeItem: (key: string, options?: any) => {
    cookieStore.delete(key);
  },
},
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(requestUrl.origin)
}