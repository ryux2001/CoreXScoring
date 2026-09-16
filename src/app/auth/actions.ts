"use server";

import { isLocale, type Locale } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type LanguagePreferenceResult =
  | { ok: true; language: Locale }
  | { ok: false; code: "invalid_language" | "unauthenticated" | "update_failed" };

export async function updateLanguagePreference(language: string): Promise<LanguagePreferenceResult> {
  if (!isLocale(language)) return { ok: false, code: "invalid_language" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) return { ok: false, code: "unauthenticated" };

  const { error } = await supabase.auth.updateUser({ data: { language } });
  return error ? { ok: false, code: "update_failed" } : { ok: true, language };
}
