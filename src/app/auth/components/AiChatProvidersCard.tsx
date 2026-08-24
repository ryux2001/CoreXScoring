"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, KeyRound } from "lucide-react";
import type { AiChatProvider, AiCredentialMode } from "@/lib/ai/types";
import type { AiChatSettingsPublic } from "@/lib/ai/chat-settings";

const EMPTY_SETTINGS: AiChatSettingsPublic = {
  credentialMode: "project",
  preferredProvider: "openrouter",
  preferredModel: "",
  models: { groq: [], openrouter: [] },
  groq: { configured: false, hint: null },
  openrouter: { configured: false, hint: null },
  localOnly: false,
};

export default function AiChatProvidersCard() {
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
        const payload = await response.json() as AiChatSettingsPublic | { error?: string };
        if (!response.ok || !("credentialMode" in payload)) throw new Error((payload as { error?: string }).error || "No se pudo cargar la configuración.");
        if (!cancelled) {
          setSettings(payload);
          setMode(payload.credentialMode);
          setProvider(payload.preferredProvider);
          setModel(payload.preferredModel);
        }
      })
      .catch((error: unknown) => { if (!cancelled) setStatus(error instanceof Error ? error.message : "No se pudo cargar la configuración."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const models = useMemo(() => settings.models[provider] || [], [provider, settings.models]);
  const selectedProvider = settings[provider];
  const canSave = mode === "project" || Boolean(apiKey.trim()) || selectedProvider.configured;

  useEffect(() => {
    if (models.length > 0 && !models.includes(model)) setModel(models[0]);
  }, [model, models]);

  const providerLabel = useMemo(() => provider === "groq" ? "Groq" : "OpenRouter", [provider]);

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
      const payload = await response.json() as AiChatSettingsPublic | { error?: string };
      if (!response.ok || !("credentialMode" in payload)) throw new Error((payload as { error?: string }).error || "No se pudo guardar la configuración.");
      setSettings(payload);
      setApiKey("");
      setStatus(mode === "byok" ? "Configuración BYOK guardada. La key no se volverá a mostrar." : "Se usarán las claves de CoreX AI.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
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
      const payload = await response.json() as AiChatSettingsPublic | { error?: string };
      if (!response.ok || !("credentialMode" in payload)) throw new Error((payload as { error?: string }).error || "No se pudo eliminar la key.");
      setSettings(payload);
      setApiKey("");
      setStatus("API key eliminada. Puedes volver a usar las claves de CoreX AI.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar la key.");
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vault/ai-provider/test", { method: "POST" });
      const payload = await response.json() as { ok?: boolean; provider?: string; model?: string; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo validar la API key.");
      setStatus(`Conexión correcta con ${payload.provider}. Modelo seleccionado: ${payload.model}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo validar la API key.");
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
          <h2 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Proveedor de IA</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Usa las claves de CoreX AI o una API key propia de {providerLabel}. La key se cifra en servidor y nunca se muestra al chat.
          </p>
        </div>
      </div>

      {settings.localOnly && (
        <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-relaxed text-amber-100" role="status">
          El modo local estricto está activo en desarrollo. CoreX AI usará Qwen local y no consumirá esta configuración hasta desactivar <code>AI_LOCAL_ONLY</code>.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-zinc-400">
          Modo
          <select value={mode} onChange={(event) => setMode(event.target.value as AiCredentialMode)} disabled={isLoading || isSaving || settings.localOnly} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40">
            <option value="project">Claves de CoreX AI</option>
            <option value="byok">Mi API key</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Proveedor
          <select value={provider} onChange={(event) => setProvider(event.target.value as AiChatProvider)} disabled={isLoading || isSaving || settings.localOnly} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40">
            <option value="openrouter">OpenRouter</option>
            <option value="groq">Groq</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Modelo permitido
          <select value={model} onChange={(event) => setModel(event.target.value)} disabled={isLoading || isSaving || settings.localOnly || models.length === 0} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40">
            {models.length === 0 ? <option value="">Sin modelos configurados</option> : models.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          API key {selectedProvider.hint ? `(${selectedProvider.hint})` : ""}
          <button type="button" aria-label="Mostrar información de seguridad de la API key" aria-expanded={showSecurityInfo} aria-controls="ai-chat-key-security" onClick={() => setShowSecurityInfo((current) => !current)} className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-300/40 text-cyan-200 transition-colors hover:border-cyan-200 hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            <Info aria-hidden="true" size={11} strokeWidth={2.5} />
          </button>
        </span>
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} disabled={isLoading || isSaving || mode === "project" || settings.localOnly} autoComplete="new-password" placeholder={selectedProvider.configured ? "Deja vacío para conservarla" : "Pega tu API key"} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-200/40" />
        {showSecurityInfo && <span id="ai-chat-key-security" role="note" className="mt-2 block rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-2.5 text-[11px] leading-relaxed text-cyan-100/80">La key se cifra en el servidor, se aísla por cuenta y no se devuelve ni se incluye en los mensajes. El proveedor y el modelo siguen limitados por CoreX AI.</span>}
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void save()} disabled={isLoading || isSaving || !model || !canSave || settings.localOnly} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-cyan-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Guardando…" : "Guardar configuración"}</button>
        {mode === "byok" && selectedProvider.configured && <button type="button" onClick={() => void testConnection()} disabled={isTesting || isSaving || settings.localOnly} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/10 disabled:opacity-50">{isTesting ? "Probando…" : "Probar conexión"}</button>}
        {selectedProvider.configured && <button type="button" onClick={() => void remove()} disabled={isSaving || settings.localOnly} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50">Eliminar key</button>}
        {status && <p className="basis-full text-xs text-cyan-200" role="status">{status}</p>}
      </div>
    </section>
  );
}
