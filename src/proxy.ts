import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const res = NextResponse.next()
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        storage: {
          getItem: (key: string) => {
            return request.cookies.get(key)?.value ?? null
          },
          // Definimos las funciones aunque no tengan lógica para cumplir con el tipo
          setItem: (key: string, value: string, options?: any) => {},
          removeItem: (key: string, options?: any) => {},
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const session = !!user

  // --- CONFIGURACIÓN DE RUTAS (OPCIÓN B) ---
  
  // 1. Lista de rutas que requieren que el usuario ESTÉ logueado
  const protectedRoutes = ['/vault', '/profile', '/dashboard', '/settings']
  
  // 2. Comprobamos si la ruta actual coincide con alguna de la lista
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // LÓGICA DE REDIRECCIÓN:

  // Caso A: El usuario intenta entrar a una ruta protegida pero NO tiene sesión
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Caso B: El usuario YA tiene sesión pero intenta entrar a la página de login/registro
  if (request.nextUrl.pathname.startsWith('/auth') && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return res
}

// El matcher debe incluir todas las rutas que el proxy debe "escuchar"
export const config = {
  matcher: [
    '/vault/:path*', 
    '/profile/:path*', 
    '/dashboard/:path*', 
    '/auth/:path*'
  ],
}