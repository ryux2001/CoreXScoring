import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { AiExternalProvider } from "./privacy";

export const AI_PRIVACY_POLICY_VERSION = "2026-09-13";

export async function getMissingExternalProviderConsents(
  userId: string,
  providers: AiExternalProvider[],
): Promise<AiExternalProvider[]> {
  const uniqueProviders = [...new Set(providers)];
  if (uniqueProviders.length === 0) return [];

  const { data, error } = await createSupabaseAdminClient()
    .from("ai_external_provider_consents")
    .select("provider")
    .eq("user_id", userId)
    .eq("policy_version", AI_PRIVACY_POLICY_VERSION)
    .in("provider", uniqueProviders);
  if (error) throw new Error("No se pudo comprobar el consentimiento de privacidad de CoreX AI.");

  const consented = new Set((data || []).map((row) => row.provider));
  return uniqueProviders.filter((provider) => !consented.has(provider));
}

export async function grantExternalProviderConsent(userId: string, provider: AiExternalProvider): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("ai_external_provider_consents")
    .upsert({
      user_id: userId,
      provider,
      policy_version: AI_PRIVACY_POLICY_VERSION,
      consented_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider,policy_version" });
  if (error) throw new Error("No se pudo guardar tu consentimiento de privacidad.");
}
