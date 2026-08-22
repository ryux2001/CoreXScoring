"use client";

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

let pendingAnonymousSession: Promise<Session> | null = null;

/**
 * Obtiene la sesión existente o crea una sesión anónima para CoreX AI.
 * La sesión se crea solo cuando el usuario intenta enviar su primer mensaje.
 */
export async function ensureAiSession(): Promise<Session> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error("No se pudo comprobar la sesión de CoreX AI.");
  }

  if (data.session?.user) return data.session;

  pendingAnonymousSession ??= supabase.auth.signInAnonymously().then(({ data: anonymousData, error: anonymousError }) => {
    if (anonymousError || !anonymousData.session?.user) {
      throw new Error("No se pudo activar el modo invitado. Inténtalo de nuevo o inicia sesión.");
    }

    return anonymousData.session;
  }).finally(() => {
    pendingAnonymousSession = null;
  });

  return pendingAnonymousSession;
}
