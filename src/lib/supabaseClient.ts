import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'sb-auth-token', // <--- Obligamos a usar este nombre
    storage: {
      getItem: (key) => {
        if (typeof document === 'undefined') return null;
        // Buscador de cookies más flexible
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${key}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      },
      setItem: (key, value) => {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
      },
      removeItem: (key) => {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=; path=/; max-age=0`;
      },
    },
  },
})