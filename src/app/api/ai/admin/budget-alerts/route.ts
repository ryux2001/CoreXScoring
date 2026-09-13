import { Resend } from "resend";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildResendBudgetAlert, OPENROUTER_BUDGET_LIMITS, type BudgetPeriod } from "@/lib/ai/budget";
import { getOptionalServerSecret } from "@/lib/server-secrets";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type BudgetRow = {
  period_kind: BudgetPeriod;
  period_start: string;
  reserved_microusd: number;
};

function isAuthorized(request: NextRequest): boolean {
  const secret = getOptionalServerSecret("AI_ALERT_CRON_SECRET") || getOptionalServerSecret("CRON_SECRET");
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcMonth(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const to = process.env.AI_ALERT_EMAIL_TO?.trim();
  const from = process.env.AI_ALERT_EMAIL_FROM?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!to || !from || !resendApiKey) {
    return NextResponse.json({ error: "Falta configurar el canal de alertas." }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: usage, error: usageError } = await supabase
    .from("ai_provider_budget_usage")
    .select("period_kind,period_start,reserved_microusd")
    .eq("provider", "openrouter")
    .in("period_kind", ["day", "month"])
    .in("period_start", [utcDate(), utcMonth()]);
  if (usageError) {
    console.error("AI budget usage query failed", { code: usageError.code || "unknown" });
    return NextResponse.json({ error: "No se pudo consultar el presupuesto." }, { status: 503 });
  }

  const limits: Record<BudgetPeriod, number> = {
    day: OPENROUTER_BUDGET_LIMITS.dailyMicrousd,
    month: OPENROUTER_BUDGET_LIMITS.monthlyMicrousd,
  };
  const resend = new Resend(resendApiKey);
  const sent: string[] = [];

  for (const row of (usage ?? []) as BudgetRow[]) {
    const limit = limits[row.period_kind];
    for (const thresholdPercent of OPENROUTER_BUDGET_LIMITS.alertThresholds) {
      if (row.reserved_microusd < limit * thresholdPercent / 100) continue;

      const { data: inserted, error: insertError } = await supabase
        .from("ai_provider_budget_alerts")
        .upsert({
          provider: "openrouter",
          period_kind: row.period_kind,
          period_start: row.period_start,
          threshold_percent: thresholdPercent,
        }, { onConflict: "provider,period_kind,period_start,threshold_percent", ignoreDuplicates: true })
        .select("provider")
        .maybeSingle();
      if (insertError) {
        console.error("AI budget alert state update failed", { code: insertError.code || "unknown" });
        continue;
      }
      if (!inserted) continue;

      const message = buildResendBudgetAlert({
        period: row.period_kind,
        thresholdPercent,
        usedMicrousd: row.reserved_microusd,
        limitMicrousd: limit,
        to,
        from,
      });
      const { error: emailError } = await resend.emails.send(message);
      if (emailError) {
        console.error("AI budget alert email failed", { name: emailError.name || "unknown" });
        await supabase
          .from("ai_provider_budget_alerts")
          .delete()
          .match({ provider: "openrouter", period_kind: row.period_kind, period_start: row.period_start, threshold_percent: thresholdPercent });
        continue;
      }

      await supabase
        .from("ai_provider_budget_alerts")
        .update({ emailed_at: new Date().toISOString() })
        .match({ provider: "openrouter", period_kind: row.period_kind, period_start: row.period_start, threshold_percent: thresholdPercent });
      sent.push(`${row.period_kind}:${thresholdPercent}`);
    }
  }

  return NextResponse.json({ ok: true, sent }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
