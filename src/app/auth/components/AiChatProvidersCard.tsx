"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AiChatProvider, AiCredentialMode } from "@/lib/ai/types";
import type { AiChatSettingsPublic } from "@/lib/ai/chat-settings";

const EMPTY_SETTINGS: AiChatSettingsPublic = {
  byokEnabled: false,
  credentialMode: "project",
  preferredProvider: "openrouter",
  preferredModel: "",
  models: { groq: [], cerebras: [], openrouter: [] },
  groq: { configured: false, hint: null },
  cerebras: { configured: false, hint: null },
  openrouter: { configured: false, hint: null },
  localOnly: false,
};

const PROVIDER_ERROR_KEYS: Record<string, string> = {
  AUTH_REQUIRED: "aiProvider.errors.authRequired",
  INVALID_REQUEST: "aiProvider.errors.invalidRequest",
  INVALID_CONFIGURATION: "aiProvider.errors.invalidConfiguration",
  INVALID_API_KEY: "aiProvider.errors.invalidApiKey",
  PROVIDER_NOT_ALLOWED: "aiProvider.errors.providerNotAllowed",
  ORIGIN_NOT_ALLOWED: "aiProvider.errors.originNotAllowed",
  SECURITY_LIMIT_UNAVAILABLE: "aiProvider.errors.securityLimitUnavailable",
  RATE_LIMITED: "aiProvider.errors.rateLimited",
  LOAD_FAILED: "aiProvider.errors.loadFailed",
  SAVE_FAILED: "aiProvider.errors.saveFailed",
  REMOVE_FAILED: "aiProvider.errors.removeFailed",
  TEST_FAILED: "aiProvider.errors.testFailed",
  BYOK_DISABLED: "aiProvider.errors.byokDisabled",
};

function getApiErrorMessage(translate: (key: string) => string, payload: { code?: string } | AiChatSettingsPublic, fallback: string): string {
  const code = "code" in payload ? payload.code : undefined;
  return translate(PROVIDER_ERROR_KEYS[code || ""] || fallback);
}

class LocalizedProviderError extends Error {}

export default function AiChatProvidersCard() {
  const t = useTranslations("account");
  const [settings, setSettings] = useState<AiChatSettingsPublic>(EMPTY_SETTINGS);
  const [mode, setMode] = useState<AiCredentialMode>("project");
  const [provider, setProvider] = useState<AiChatProvider>("openrouter");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/vault/ai-provider", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as AiChatSettingsPublic | { code?: string };
        if (!response.ok || !("credentialMode" in payload)) throw new LocalizedProviderError(getApiErrorMessage(t, payload, "aiProvider.errors.loadFailed"));
        if (!cancelled) {
          setSettings(payload);
          setMode(payload.credentialMode);
          setProvider(payload.preferredProvider);
          setModel(payload.preferredModel);
        }
      })
      .catch((error: unknown) => { if (!cancelled) setStatus(error instanceof LocalizedProviderError ? error.message : t("aiProvider.errors.loadFailed")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const models = useMemo(() => settings.models[provider] || [], [provider, settings.models]);
  const selectedProvider = settings[provider];
  const canSave = mode === "project" || Boolean(apiKey.trim()) || selectedProvider.configured;

  useEffect(() => {
    if (models.length > 0 && !models.includes(model)) setModel(models[0]);
  }, [model, models]);

  const providerLabel = useMemo(() => provider === "groq" ? "Groq" : provider === "cerebras" ? "Cerebras" : "OpenRouter", [provider]);

  const save = async () => {
    if (!model || !canSave) return;
    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vault/ai-provider", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialMode: mode, provider, model, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
      });
      const payload = await response.json() as AiChatSettingsPublic | { code?: string };
      if (!response.ok || !("credentialMode" in payload)) throw new LocalizedProviderError(getApiErrorMessage(t, payload, "aiProvider.errors.saveFailed"));
      setSettings(payload);
      setApiKey("");
      setStatus(mode === "byok" ? t("aiProvider.status.byokSaved") : t("aiProvider.status.projectSaved"));
    } catch (error) {
      setStatus(error instanceof LocalizedProviderError ? error.message : t("aiProvider.errors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vault/ai-provider", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const payload = await response.json() as AiChatSettingsPublic | { code?: string };
      if (!response.ok || !("credentialMode" in payload)) throw new LocalizedProviderError(getApiErrorMessage(t, payload, "aiProvider.errors.removeFailed"));
      setSettings(payload);
      setApiKey("");
      setStatus(t("aiProvider.status.keyRemoved"));
    } catch (error) {
      setStatus(error instanceof LocalizedProviderError ? error.message : t("aiProvider.errors.removeFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vault/ai-provider/test", { method: "POST" });
      const payload = await response.json() as { ok?: boolean; provider?: string; model?: string; code?: string };
      if (!response.ok || !payload.ok) throw new LocalizedProviderError(getApiErrorMessage(t, payload, "aiProvider.errors.testFailed"));
      setStatus(t("aiProvider.status.connectionSuccess", { provider: payload.provider || providerLabel, model: payload.model || model }));
    } catch (error) {
      setStatus(error instanceof LocalizedProviderError ? error.message : t("aiProvider.errors.testFailed"));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <section className="mt-8 border-t border-zinc-800 pt-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">
          <KeyRound aria-hidden="true" size={17} />
        </span>
        <div>
          <h2 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">{t("aiProvider.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            {t("aiProvider.description", { provider: providerLabel })}
          </p>
        </div>
      </div>

      {settings.localOnly && (
        <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-relaxed text-amber-100" role="status">
          {t.rich("aiProvider.localOnly", { code: (chunks) => <code>{chunks}</code> })}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-zinc-400">
          {t("aiProvider.mode")}
          <select value={mode} onChange={(event) => setMode(event.target.value as AiCredentialMode)} disabled={isLoading || isSaving || settings.localOnly} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40">
            <option value="project">{t("aiProvider.projectKeys")}</option>
            {settings.byokEnabled && <option value="byok">{t("aiProvider.myApiKey")}</option>}
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          {t("aiProvider.provider")}
          <select value={provider} onChange={(event) => setProvider(event.target.value as AiChatProvider)} disabled={isLoading || isSaving || settings.localOnly} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40">
            <option value="openrouter">OpenRouter</option>
            <option value="groq">Groq</option>
            <option value="cerebras">Cerebras</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          {t("aiProvider.allowedModel")}
          <select value={model} onChange={(event) => setModel(event.target.value)} disabled={isLoading || isSaving || settings.localOnly || models.length === 0} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40">
            {models.length === 0 ? <option value="">{t("aiProvider.noModels")}</option> : models.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {settings.byokEnabled && <label className="mt-3 block text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          {t("aiProvider.apiKey")}{selectedProvider.hint ? ` (${selectedProvider.hint})` : ""}
          <button type="button" aria-label={t("aiProvider.showSecurityInfo")} aria-expanded={showSecurityInfo} aria-controls="ai-chat-key-security" onClick={() => setShowSecurityInfo((current) => !current)} className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-300/40 text-cyan-200 transition-colors hover:border-cyan-200 hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            <Info aria-hidden="true" size={11} strokeWidth={2.5} />
          </button>
        </span>
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} disabled={isLoading || isSaving || mode === "project" || settings.localOnly} autoComplete="new-password" placeholder={selectedProvider.configured ? t("aiProvider.keepExisting") : t("aiProvider.pasteKey")} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40" />
        {showSecurityInfo && <span id="ai-chat-key-security" role="note" className="mt-2 block rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-2.5 text-[11px] leading-relaxed text-cyan-100/80">{t("aiProvider.securityInfo")}</span>}
      </label>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
         <button type="button" onClick={() => void save()} disabled={isLoading || isSaving || !model || !canSave || settings.localOnly} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-cyan-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? t("aiProvider.saving") : t("aiProvider.save")}</button>
         {settings.byokEnabled && mode === "byok" && selectedProvider.configured && <button type="button" onClick={() => void testConnection()} disabled={isTesting || isSaving || settings.localOnly} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/10 disabled:opacity-50">{isTesting ? t("aiProvider.testing") : t("aiProvider.test")}</button>}
         {settings.byokEnabled && selectedProvider.configured && <button type="button" onClick={() => void remove()} disabled={isSaving || settings.localOnly} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50">{t("aiProvider.remove")}</button>}
        {status && <p className="basis-full text-xs text-cyan-200" role="status">{status}</p>}
      </div>
    </section>
  );
}
