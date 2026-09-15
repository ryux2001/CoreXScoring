"use client";

import { Link } from "@/i18n/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AiAdminConfig,
  AiAdminDailyUsage,
  AiAdminError,
  AiAdminIpBucket,
  AiAdminProviderUsage,
  AiAdminUsageResponse,
} from "@/lib/ai/admin-types";

const PERIODS = [7, 14, 30] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDuration(value: number): string {
  return `${formatNumber(Math.round(value))} ms`;
}

function getIpLabel(ipHash: string): string {
  return `…${ipHash.slice(-8)}`;
}

function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}

function QuotaCard({
  label,
  messages,
  tokens,
  icon: Icon,
}: {
  label: string;
  messages: number;
  tokens: number;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
        <Icon aria-hidden="true" size={17} className="text-cyan-200/80" />
      </div>
      <p className="mt-4 font-display text-2xl font-black text-white">{formatNumber(messages)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">mensajes por usuario / día</p>
      <div className="mt-4 border-t border-zinc-800 pt-3">
        <p className="font-technical text-xs text-zinc-300">{formatNumber(tokens)} tokens</p>
        <p className="mt-1 text-[10px] text-zinc-600">límite diario configurado</p>
      </div>
    </article>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <p className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">{eyebrow}</p>
      <h2 className="mt-1 font-display text-xl font-black tracking-tight text-white">{title}</h2>
      {description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">{description}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-xs text-zinc-600">
      {message}
    </div>
  );
}

export default function AdminAiDashboard() {
  const [period, setPeriod] = useState<number>(7);
  const [data, setData] = useState<AiAdminUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState(90);
  const [cleanupState, setCleanupState] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const loadUsage = useCallback(async (requestedPeriod: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/admin/usage?days=${requestedPeriod}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await response.json() as AiAdminUsageResponse | { error?: string };

      if (!response.ok || !("days" in payload)) {
        throw new Error("error" in payload && payload.error
          ? payload.error
          : "No se pudieron cargar las métricas.");
      }

      setData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las métricas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runCleanup = useCallback(async () => {
    if (!window.confirm(`Se eliminará la telemetría anterior a ${retentionDays} días. Esta acción no se puede deshacer. ¿Continuar?`)) return;

    setIsCleaning(true);
    setCleanupState(null);
    try {
      const response = await fetch("/api/ai/admin/cleanup", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays }),
      });
      const payload = await response.json() as {
        deleted_action_logs?: number;
        deleted_usage_daily?: number;
        error?: string;
      };

      if (!response.ok) throw new Error(payload.error ?? "No se pudo ejecutar la limpieza.");

      setCleanupState({
        type: "success",
        message: `Limpieza completada: ${formatNumber(payload.deleted_action_logs ?? 0)} logs y ${formatNumber(payload.deleted_usage_daily ?? 0)} buckets eliminados.`,
      });
      await loadUsage(period);
    } catch (requestError) {
      setCleanupState({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "No se pudo ejecutar la limpieza.",
      });
    } finally {
      setIsCleaning(false);
    }
  }, [loadUsage, period, retentionDays]);

  useEffect(() => {
    void loadUsage(period);
  }, [loadUsage, period]);

  const summary = useMemo(() => {
    const providers = data?.providers ?? [];
    return {
      requests: sumBy(providers, (item) => item.requests),
      tokens: sumBy(providers, (item) => item.tokens),
      blocked: sumBy(providers.filter((item) => item.status === "rate_limited"), (item) => item.requests),
      errors: sumBy(providers.filter((item) => item.status === "error"), (item) => item.requests),
    };
  }, [data]);

  const alerts = useMemo(() => {
    const items: Array<{ tone: "warning" | "danger" | "info"; title: string; description: string }> = [];
    const providers = data?.providers ?? [];

    if (summary.errors > 0 || (data?.errors.length ?? 0) > 0) {
      items.push({
        tone: "danger",
        title: "Hay errores de proveedor registrados",
        description: "Revisa la tabla de errores y los logs del servidor antes de aumentar las cuotas.",
      });
    }

    if (providers.some((item) => item.provider === "groq" && item.status === "rate_limited")) {
      items.push({
        tone: "warning",
        title: "Groq alcanzó un límite",
        description: "El gateway debe usar OpenRouter como fallback cuando el error esté clasificado como rate limit.",
      });
    }

    if (summary.blocked > 0) {
      items.push({
        tone: "warning",
        title: "Se bloquearon peticiones por cuota",
        description: "Comprueba si los límites están evitando abuso o si están afectando a usuarios legítimos.",
      });
    }

    if (items.length === 0 && summary.requests > 0) {
      items.push({
        tone: "info",
        title: "Operación normal",
        description: "No se detectaron errores ni bloqueos en el período seleccionado.",
      });
    }

    return items;
  }, [data, summary.blocked, summary.errors, summary.requests]);

  const config: AiAdminConfig | undefined = data?.config;
  const dailyUsage: AiAdminDailyUsage[] = data?.daily_usage ?? [];
  const providers: AiAdminProviderUsage[] = data?.providers ?? [];
  const errors: AiAdminError[] = data?.errors ?? [];
  const ipBuckets: AiAdminIpBucket[] = data?.top_ip_buckets ?? [];

  return (
    <main className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/vault"
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <ArrowLeft aria-hidden="true" size={13} />
                Volver a la bóveda
              </Link>
              <div className="mt-6 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                  <ShieldCheck aria-hidden="true" size={19} />
                </span>
                <div>
                  <p className="font-display text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200/70">Control operativo</p>
                  <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-white">CoreX AI</h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
                Consumo, proveedores y límites de uso. Esta vista no muestra conversaciones ni credenciales.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-zinc-800 bg-black p-1" aria-label="Período de métricas">
                {PERIODS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPeriod(value)}
                    aria-pressed={period === value}
                    className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                      period === value ? "bg-white text-black" : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {value} días
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void loadUsage(period)}
                disabled={isLoading}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-xs font-bold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-wait disabled:opacity-50"
              >
                <RefreshCw aria-hidden="true" size={15} className={isLoading ? "animate-spin" : undefined} />
                Actualizar
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-red-300" size={17} />
              <div>
                <p className="font-bold">No se pudo cargar el panel</p>
                <p className="mt-1 text-xs text-red-100/75">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && !data ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Cargando métricas">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl border border-zinc-900 bg-zinc-950" />)}
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del período">
              <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Solicitudes</span><Activity aria-hidden="true" size={17} className="text-cyan-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-white">{formatNumber(summary.requests)}</p>
                <p className="mt-1 text-xs text-zinc-600">registradas en el período</p>
              </article>
              <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Tokens reales</span><Clock3 aria-hidden="true" size={17} className="text-cyan-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-white">{formatNumber(summary.tokens)}</p>
                <p className="mt-1 text-xs text-zinc-600">uso informado por proveedores</p>
              </article>
              <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Bloqueadas</span><ShieldCheck aria-hidden="true" size={17} className="text-amber-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-amber-100">{formatNumber(summary.blocked)}</p>
                <p className="mt-1 text-xs text-zinc-600">por cuota o límite</p>
              </article>
              <article className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Errores</span><AlertTriangle aria-hidden="true" size={17} className="text-red-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-red-100">{formatNumber(summary.errors)}</p>
                <p className="mt-1 text-xs text-zinc-600">respuestas fallidas</p>
              </article>
            </section>

            {alerts.length > 0 && (
              <section className="mt-6" aria-labelledby="ai-alerts-title">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">Señales operativas</p>
                    <h2 id="ai-alerts-title" className="mt-1 font-display text-xl font-black tracking-tight text-white">Alertas</h2>
                  </div>
                  <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">{alerts.length} activa{alerts.length === 1 ? "" : "s"}</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {alerts.map((alert) => {
                    const styles = alert.tone === "danger"
                      ? "border-red-300/20 bg-red-300/[0.04] text-red-100"
                      : alert.tone === "warning"
                        ? "border-amber-300/20 bg-amber-300/[0.04] text-amber-100"
                        : "border-cyan-300/20 bg-cyan-300/[0.04] text-cyan-100";
                    return (
                      <article key={alert.title} className={`rounded-2xl border p-4 ${styles}`}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 opacity-80" size={17} />
                          <div>
                            <h3 className="text-sm font-bold">{alert.title}</h3>
                            <p className="mt-1 text-xs leading-relaxed opacity-70">{alert.description}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-8">
              <SectionTitle eyebrow="Configuración activa" title="Cuotas" description="Límites actuales por tipo de actor. Se aplican en la próxima petición." />
              {config ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <QuotaCard label="Invitado" messages={config.anonymous_daily_messages} tokens={config.anonymous_daily_tokens} icon={Users} />
                  <QuotaCard label="Registrado" messages={config.authenticated_daily_messages} tokens={config.authenticated_daily_tokens} icon={Users} />
                  <QuotaCard label="IP · invitado" messages={config.anonymous_ip_daily_messages} tokens={config.anonymous_ip_daily_tokens} icon={Wifi} />
                  <QuotaCard label="IP · registrado" messages={config.authenticated_ip_daily_messages} tokens={config.authenticated_ip_daily_tokens} icon={Wifi} />
                </div>
              ) : <EmptyState message="No hay configuración de cuotas disponible." />}
            </section>

            <section className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <SectionTitle eyebrow="Actividad" title="Uso diario" description="Los tokens combinan uso real liquidado y reservas pendientes." />
                {dailyUsage.length === 0 ? <EmptyState message="Sin actividad registrada en este período." /> : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                        <tr><th className="px-4 py-3 font-bold">Día</th><th className="px-4 py-3 font-bold">Mensajes</th><th className="px-4 py-3 font-bold">Tokens</th><th className="px-4 py-3 font-bold">Buckets IP</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {dailyUsage.map((item) => <tr key={item.usage_date} className="text-zinc-300"><td className="px-4 py-3 font-bold text-white">{formatDate(item.usage_date)}</td><td className="px-4 py-3">{formatNumber(item.user_messages)}</td><td className="px-4 py-3">{formatNumber(item.user_reserved_tokens)}</td><td className="px-4 py-3">{formatNumber(item.ip_buckets)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <SectionTitle eyebrow="Distribución" title="Proveedores" description="Incluye respuestas exitosas, guardrails y bloqueos." />
                {providers.length === 0 ? <EmptyState message="Sin llamadas a proveedores en este período." /> : (
                  <div className="space-y-3">
                    {providers.map((item) => (
                      <div key={`${item.provider}-${item.status}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <div className="flex items-center justify-between gap-3"><span className="font-display text-sm font-bold text-white">{item.provider}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${item.status === "success" ? "bg-emerald-300/10 text-emerald-200" : item.status === "rate_limited" ? "bg-amber-300/10 text-amber-200" : "bg-red-300/10 text-red-200"}`}>{item.status}</span></div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-500"><span><strong className="block text-sm text-zinc-200">{formatNumber(item.requests)}</strong>solicitudes</span><span><strong className="block text-sm text-zinc-200">{formatNumber(item.tokens)}</strong>tokens</span><span><strong className="block text-sm text-zinc-200">{formatDuration(item.average_duration_ms)}</strong>media</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-8 grid gap-8 lg:grid-cols-2">
              <div>
                <SectionTitle eyebrow="Protección" title="Errores" />
                {errors.length === 0 ? <EmptyState message="No hay errores registrados en este período." /> : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70"><table className="w-full text-left text-xs"><thead className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.16em] text-zinc-600"><tr><th className="px-4 py-3 font-bold">Código</th><th className="px-4 py-3 font-bold">Ocurrencias</th></tr></thead><tbody className="divide-y divide-zinc-900">{errors.map((item) => <tr key={item.error_code} className="text-zinc-300"><td className="px-4 py-3 font-technical text-red-200">{item.error_code}</td><td className="px-4 py-3">{formatNumber(item.failures)}</td></tr>)}</tbody></table></div>
                )}
              </div>
              <div>
                <SectionTitle eyebrow="Antiabuso" title="Buckets de IP" description="Se muestra solo el sufijo del HMAC, nunca la IP original." />
                {ipBuckets.length === 0 ? <EmptyState message="No hay actividad por IP en este período." /> : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70"><table className="w-full text-left text-xs"><thead className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.16em] text-zinc-600"><tr><th className="px-4 py-3 font-bold">Huella</th><th className="px-4 py-3 font-bold">Solicitudes</th></tr></thead><tbody className="divide-y divide-zinc-900">{ipBuckets.map((item) => <tr key={item.ip_hash} className="text-zinc-300"><td className="px-4 py-3 font-technical text-cyan-100">{getIpLabel(item.ip_hash)}</td><td className="px-4 py-3">{formatNumber(item.requests)}</td></tr>)}</tbody></table></div>
                )}
              </div>
            </section>

            <section className="mt-8" aria-labelledby="ai-maintenance-title">
              <SectionTitle
                eyebrow="Mantenimiento"
                title="Retención de telemetría"
                description="Elimina logs y buckets diarios antiguos. La operación está protegida por rol admin y requiere confirmación explícita."
              />
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-black text-zinc-500">
                    <Trash2 aria-hidden="true" size={16} />
                  </span>
                  <div>
                    <h3 id="ai-maintenance-title" className="text-sm font-bold text-white">Limpieza manual</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">El mínimo permitido es 30 días para conservar una ventana útil de diagnóstico.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
                  <label htmlFor="ai-retention-days" className="sr-only">Retener telemetría durante</label>
                  <select
                    id="ai-retention-days"
                    value={retentionDays}
                    onChange={(event) => setRetentionDays(Number(event.target.value))}
                    className="min-h-11 rounded-xl border border-zinc-800 bg-black px-3 text-xs font-bold text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    {[30, 90, 180, 365].map((days) => <option key={days} value={days}>{days} días</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => void runCleanup()}
                    disabled={isCleaning}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200/20 bg-amber-200/[0.06] px-4 text-xs font-bold text-amber-100 transition-colors hover:border-amber-200/40 hover:bg-amber-200/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                    {isCleaning ? "Limpiando…" : "Ejecutar limpieza"}
                  </button>
                </div>
              </div>
              {cleanupState && (
                <p role="status" className={`mt-3 text-xs ${cleanupState.type === "success" ? "text-emerald-200" : "text-red-200"}`}>
                  {cleanupState.message}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
