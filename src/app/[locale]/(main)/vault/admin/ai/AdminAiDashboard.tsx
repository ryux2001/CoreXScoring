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
import { useLocale, useTranslations } from 'next-intl';

const PERIODS = [7, 14, 30] as const;

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00Z`));
}

function getIpLabel(ipHash: string): string {
  return `…${ipHash.slice(-8)}`;
}

function getProviderStatusKey(status: AiAdminProviderUsage["status"]): string {
  return status === "rate_limited" ? "rateLimited" : status;
}

function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}

function QuotaCard({
  label,
  messages,
  locale,
  messagesDescription,
  tokensLabel,
  tokensDescription,
  icon: Icon,
}: {
  label: string;
  messages: number;
  locale: string;
  messagesDescription: string;
  tokensLabel: string;
  tokensDescription: string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
        <Icon aria-hidden="true" size={17} className="text-cyan-200/80" />
      </div>
      <p className="mt-4 font-display text-2xl font-black text-white">{formatNumber(messages, locale)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{messagesDescription}</p>
      <div className="mt-4 border-t border-zinc-800 pt-3">
        <p className="font-technical text-xs text-zinc-300">{tokensLabel}</p>
        <p className="mt-1 text-[10px] text-zinc-600">{tokensDescription}</p>
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
  const t = useTranslations('admin.ai');
  const tc = useTranslations('admin.common');
  const locale = useLocale();
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
        throw new Error('REQUEST_FAILED');
      }

      setData(payload);
    } catch {
      setError(t('errors.loadMetrics'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const runCleanup = useCallback(async () => {
    if (!window.confirm(t('cleanup.confirm', { days: retentionDays }))) return;

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

      if (!response.ok) throw new Error('REQUEST_FAILED');

      setCleanupState({
        type: "success",
        message: t('cleanup.success', { logs: formatNumber(payload.deleted_action_logs ?? 0, locale), buckets: formatNumber(payload.deleted_usage_daily ?? 0, locale) }),
      });
      await loadUsage(period);
    } catch {
      setCleanupState({
        type: "error",
        message: t('errors.cleanup'),
      });
    } finally {
      setIsCleaning(false);
    }
  }, [loadUsage, locale, period, retentionDays, t]);

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
        title: t('alerts.providerErrors.title'),
        description: t('alerts.providerErrors.description'),
      });
    }

    if (providers.some((item) => item.provider === "groq" && item.status === "rate_limited")) {
      items.push({
        tone: "warning",
        title: t('alerts.groqRateLimit.title'),
        description: t('alerts.groqRateLimit.description'),
      });
    }

    if (summary.blocked > 0) {
      items.push({
        tone: "warning",
        title: t('alerts.quotaBlocked.title'),
        description: t('alerts.quotaBlocked.description'),
      });
    }

    if (items.length === 0 && summary.requests > 0) {
      items.push({
        tone: "info",
        title: t('alerts.normal.title'),
        description: t('alerts.normal.description'),
      });
    }

    return items;
  }, [data, summary.blocked, summary.errors, summary.requests, t]);

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
                {t('backToVault')}
              </Link>
              <div className="mt-6 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                  <ShieldCheck aria-hidden="true" size={19} />
                </span>
                <div>
                  <p className="font-display text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200/70">{t('header.eyebrow')}</p>
                  <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-white">{t('header.title')}</h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
                {t('header.description')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-zinc-800 bg-black p-1" aria-label={t('metricPeriod')}>
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
                    {t('days', { count: value })}
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
                 {t('refresh')}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-red-300" size={17} />
              <div>
                <p className="font-bold">{t('errors.panelLoad')}</p>
                <p className="mt-1 text-xs text-red-100/75">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && !data ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('loadingMetrics')}>
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl border border-zinc-900 bg-zinc-950" />)}
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('periodSummary')}>
              <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">{t('summary.requests.label')}</span><Activity aria-hidden="true" size={17} className="text-cyan-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-white">{formatNumber(summary.requests, locale)}</p>
                <p className="mt-1 text-xs text-zinc-600">{t('summary.requests.description')}</p>
              </article>
              <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">{t('summary.tokens.label')}</span><Clock3 aria-hidden="true" size={17} className="text-cyan-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-white">{formatNumber(summary.tokens, locale)}</p>
                <p className="mt-1 text-xs text-zinc-600">{t('summary.tokens.description')}</p>
              </article>
              <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">{t('summary.blocked.label')}</span><ShieldCheck aria-hidden="true" size={17} className="text-amber-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-amber-100">{formatNumber(summary.blocked, locale)}</p>
                <p className="mt-1 text-xs text-zinc-600">{t('summary.blocked.description')}</p>
              </article>
              <article className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-4">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">{t('summary.errors.label')}</span><AlertTriangle aria-hidden="true" size={17} className="text-red-200/80" /></div>
                <p className="mt-4 font-display text-3xl font-black text-red-100">{formatNumber(summary.errors, locale)}</p>
                <p className="mt-1 text-xs text-zinc-600">{t('summary.errors.description')}</p>
              </article>
            </section>

            {alerts.length > 0 && (
              <section className="mt-6" aria-labelledby="ai-alerts-title">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">{t('alerts.eyebrow')}</p>
                    <h2 id="ai-alerts-title" className="mt-1 font-display text-xl font-black tracking-tight text-white">{t('alerts.title')}</h2>
                  </div>
                  <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">{t('alerts.activeCount', { count: alerts.length })}</span>
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
              <SectionTitle eyebrow={t('quotas.eyebrow')} title={t('quotas.title')} description={t('quotas.description')} />
              {config ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <QuotaCard label={t('quotas.anonymous')} messages={config.anonymous_daily_messages} locale={locale} messagesDescription={t('quotas.messagesDescription')} tokensLabel={t('quotas.tokens', { count: formatNumber(config.anonymous_daily_tokens, locale) })} tokensDescription={t('quotas.tokensDescription')} icon={Users} />
                  <QuotaCard label={t('quotas.authenticated')} messages={config.authenticated_daily_messages} locale={locale} messagesDescription={t('quotas.messagesDescription')} tokensLabel={t('quotas.tokens', { count: formatNumber(config.authenticated_daily_tokens, locale) })} tokensDescription={t('quotas.tokensDescription')} icon={Users} />
                  <QuotaCard label={t('quotas.anonymousIp')} messages={config.anonymous_ip_daily_messages} locale={locale} messagesDescription={t('quotas.messagesDescription')} tokensLabel={t('quotas.tokens', { count: formatNumber(config.anonymous_ip_daily_tokens, locale) })} tokensDescription={t('quotas.tokensDescription')} icon={Wifi} />
                  <QuotaCard label={t('quotas.authenticatedIp')} messages={config.authenticated_ip_daily_messages} locale={locale} messagesDescription={t('quotas.messagesDescription')} tokensLabel={t('quotas.tokens', { count: formatNumber(config.authenticated_ip_daily_tokens, locale) })} tokensDescription={t('quotas.tokensDescription')} icon={Wifi} />
                </div>
              ) : <EmptyState message={t('quotas.empty')} />}
            </section>

            <section className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <SectionTitle eyebrow={t('dailyUsage.eyebrow')} title={t('dailyUsage.title')} description={t('dailyUsage.description')} />
                {dailyUsage.length === 0 ? <EmptyState message={t('dailyUsage.empty')} /> : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                        <tr><th className="px-4 py-3 font-bold">{t('dailyUsage.table.day')}</th><th className="px-4 py-3 font-bold">{t('dailyUsage.table.messages')}</th><th className="px-4 py-3 font-bold">{t('dailyUsage.table.tokens')}</th><th className="px-4 py-3 font-bold">{t('dailyUsage.table.ipBuckets')}</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {dailyUsage.map((item) => <tr key={item.usage_date} className="text-zinc-300"><td className="px-4 py-3 font-bold text-white">{formatDate(item.usage_date, locale)}</td><td className="px-4 py-3">{formatNumber(item.user_messages, locale)}</td><td className="px-4 py-3">{formatNumber(item.user_reserved_tokens, locale)}</td><td className="px-4 py-3">{formatNumber(item.ip_buckets, locale)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <SectionTitle eyebrow={t('providers.eyebrow')} title={t('providers.title')} description={t('providers.description')} />
                {providers.length === 0 ? <EmptyState message={t('providers.empty')} /> : (
                  <div className="space-y-3">
                    {providers.map((item) => (
                      <div key={`${item.provider}-${item.status}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <div className="flex items-center justify-between gap-3"><span className="font-display text-sm font-bold text-white">{item.provider}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${item.status === "success" ? "bg-emerald-300/10 text-emerald-200" : item.status === "rate_limited" ? "bg-amber-300/10 text-amber-200" : "bg-red-300/10 text-red-200"}`}>{tc(`providerStatus.${getProviderStatusKey(item.status)}`)}</span></div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-500"><span><strong className="block text-sm text-zinc-200">{formatNumber(item.requests, locale)}</strong>{t('providers.metrics.requests')}</span><span><strong className="block text-sm text-zinc-200">{formatNumber(item.tokens, locale)}</strong>{t('providers.metrics.tokens')}</span><span><strong className="block text-sm text-zinc-200">{t('providers.metrics.milliseconds', { value: formatNumber(Math.round(item.average_duration_ms), locale) })}</strong>{t('providers.metrics.average')}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-8 grid gap-8 lg:grid-cols-2">
              <div>
                <SectionTitle eyebrow={t('errorsSection.eyebrow')} title={t('errorsSection.title')} />
                {errors.length === 0 ? <EmptyState message={t('errorsSection.empty')} /> : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70"><table className="w-full text-left text-xs"><thead className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.16em] text-zinc-600"><tr><th className="px-4 py-3 font-bold">{t('errorsSection.table.code')}</th><th className="px-4 py-3 font-bold">{t('errorsSection.table.occurrences')}</th></tr></thead><tbody className="divide-y divide-zinc-900">{errors.map((item) => <tr key={item.error_code} className="text-zinc-300"><td className="px-4 py-3 font-technical text-red-200">{item.error_code}</td><td className="px-4 py-3">{formatNumber(item.failures, locale)}</td></tr>)}</tbody></table></div>
                )}
              </div>
              <div>
                <SectionTitle eyebrow={t('ipBuckets.eyebrow')} title={t('ipBuckets.title')} description={t('ipBuckets.description')} />
                {ipBuckets.length === 0 ? <EmptyState message={t('ipBuckets.empty')} /> : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70"><table className="w-full text-left text-xs"><thead className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.16em] text-zinc-600"><tr><th className="px-4 py-3 font-bold">{t('ipBuckets.table.fingerprint')}</th><th className="px-4 py-3 font-bold">{t('ipBuckets.table.requests')}</th></tr></thead><tbody className="divide-y divide-zinc-900">{ipBuckets.map((item) => <tr key={item.ip_hash} className="text-zinc-300"><td className="px-4 py-3 font-technical text-cyan-100">{getIpLabel(item.ip_hash)}</td><td className="px-4 py-3">{formatNumber(item.requests, locale)}</td></tr>)}</tbody></table></div>
                )}
              </div>
            </section>

            <section className="mt-8" aria-labelledby="ai-maintenance-title">
              <SectionTitle
                eyebrow={t('maintenance.eyebrow')}
                title={t('maintenance.title')}
                description={t('maintenance.description')}
              />
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-black text-zinc-500">
                    <Trash2 aria-hidden="true" size={16} />
                  </span>
                  <div>
                    <h3 id="ai-maintenance-title" className="text-sm font-bold text-white">{t('maintenance.manualCleanup')}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t('maintenance.minimumRetention')}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
                  <label htmlFor="ai-retention-days" className="sr-only">{t('maintenance.retentionLabel')}</label>
                  <select
                    id="ai-retention-days"
                    value={retentionDays}
                    onChange={(event) => setRetentionDays(Number(event.target.value))}
                    className="min-h-11 rounded-xl border border-zinc-800 bg-black px-3 text-xs font-bold text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    {[30, 90, 180, 365].map((days) => <option key={days} value={days}>{t('days', { count: days })}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => void runCleanup()}
                    disabled={isCleaning}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200/20 bg-amber-200/[0.06] px-4 text-xs font-bold text-amber-100 transition-colors hover:border-amber-200/40 hover:bg-amber-200/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                    {isCleaning ? t('maintenance.cleaning') : t('maintenance.runCleanup')}
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
