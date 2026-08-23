"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

type Provider = "tavily" | "brave";
interface ProviderState { configured: boolean; hint: string | null; serverFallback: boolean }
interface Settings { preferredProvider: Provider; tavily: ProviderState; brave: ProviderState }

const EMPTY_SETTINGS: Settings = {
  preferredProvider: "tavily",
  tavily: { configured: false, hint: null, serverFallback: false },
  brave: { configured: false, hint: null, serverFallback: false },
};

export default function AiSearchProvidersCard() {
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [provider, setProvider] = useState<Provider>("tavily");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSecurityInfoOpen, setIsSecurityInfoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/vault/ai-search", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as Settings | { error?: string };
        if (!response.ok || !("preferredProvider" in payload)) throw new Error((payload as { error?: string }).error || "No se pudo cargar la configuración.");
        if (!cancelled) {
          setSettings(payload);
          setProvider(payload.preferredProvider);
        }
      })
      .catch((error: unknown) => { if (!cancelled) setStatus(error instanceof Error ? error.message : "No se pudo cargar la configuración."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selected = settings[provider];
  const save = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vault/ai-search", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
      });
      const payload = await response.json() as Settings | { error?: string };
      if (!response.ok || !("preferredProvider" in payload)) throw new Error((payload as { error?: string }).error || "No se pudo guardar la configuración.");
      setSettings(payload);
      setApiKey("");
      setStatus("Configuración guardada. La clave no se volverá a mostrar.");
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
      const response = await fetch("/api/vault/ai-search", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo eliminar la clave.");
      setSettings((current) => ({ ...current, [provider]: { ...current[provider], configured: false, hint: null } }));
      setStatus("API key eliminada. Se usará la configuración del servidor si existe.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar la clave.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-8 border-t border-zinc-800 pt-6">
      <h2 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Búsqueda web del asistente</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
        Guarda una API key propia de Tavily o Brave Search. Se cifra en el servidor, no se muestra al chatbot y solo se usa para tus búsquedas.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <label className="text-xs text-zinc-400">Proveedor activo
          <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} disabled={isLoading || isSaving} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400">
            <option value="tavily">Tavily</option>
            <option value="brave">Brave Search</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            API key {selected?.hint ? `(${selected.hint})` : ""}
            <button
              type="button"
              aria-label="Mostrar cómo protegemos tu API key"
              aria-expanded={isSecurityInfoOpen}
              aria-controls="ai-search-key-security-info"
              onClick={() => setIsSecurityInfoOpen((open) => !open)}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-300/40 text-cyan-200 transition-colors hover:border-cyan-200 hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              <Info aria-hidden="true" size={11} strokeWidth={2.5} />
            </button>
          </span>
          <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} disabled={isLoading || isSaving} autoComplete="new-password" placeholder={selected?.configured ? "Deja vacío para conservarla" : "Pega tu API key"} className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-400" />
          {isSecurityInfoOpen && (
            <span id="ai-search-key-security-info" role="note" className="mt-2 block rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-2.5 text-[11px] leading-relaxed text-cyan-100/80">
              Tratamos tu API key como un secreto: se cifra antes de almacenarla, queda aislada en tu cuenta y nunca se muestra de nuevo ni se incluye en tus conversaciones con la IA. Solo el servidor la utiliza para realizar búsquedas con el proveedor que eliges. Puedes eliminarla en cualquier momento.
            </span>
          )}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void save()} disabled={isLoading || isSaving || (!apiKey.trim() && !selected?.configured && !selected?.serverFallback)} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-cyan-950 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Guardando…" : "Guardar proveedor"}</button>
        {selected?.configured && <button type="button" onClick={() => void remove()} disabled={isSaving} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Eliminar key</button>}
        {selected?.serverFallback && <span className="text-[11px] text-zinc-500">También hay una key de servidor disponible.</span>}
      </div>
      {status && <p className="mt-3 text-xs text-cyan-200" role="status">{status}</p>}
    </section>
  );
}
