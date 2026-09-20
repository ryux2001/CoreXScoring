"use client";

import { Check, Clock3, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PendingAction } from "@/lib/ai/types";

interface PendingActionCardProps {
  action: PendingAction;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function getActionDescription(action: PendingAction, t: ReturnType<typeof useTranslations>): string {
  const slotLabels: Record<string, string> = {
    cpu: t("pendingAction.slots.cpu"),
    gpu: t("pendingAction.slots.gpu"),
    ram: t("pendingAction.slots.ram"),
    motherboard: t("pendingAction.slots.motherboard"),
    storage: t("pendingAction.slots.storage"),
    psu: t("pendingAction.slots.psu"),
  };
  if (action.type === "set_custom_price") {
    return t("pendingAction.changePrice", {
      slot: slotLabels[action.summary.slot ?? ""] ?? action.summary.slot,
      price: action.summary.price ?? 0,
      currency: action.summary.currency ?? "USD",
    });
  }

  return t(action.type === "create_combo" ? "pendingAction.createCombo" : "pendingAction.createBuild", {
    title: action.summary.entityTitle ?? action.title,
  });
}

export default function PendingActionCard({ action, isConfirming, onConfirm, onCancel }: PendingActionCardProps) {
  const t = useTranslations("ai");
  const slotLabels: Record<string, string> = {
    cpu: t("pendingAction.slots.cpu"),
    gpu: t("pendingAction.slots.gpu"),
    ram: t("pendingAction.slots.ram"),
    motherboard: t("pendingAction.slots.motherboard"),
    storage: t("pendingAction.slots.storage"),
    psu: t("pendingAction.slots.psu"),
  };

  return (
    <div className="mx-4 rounded-2xl border border-amber-200/25 bg-amber-200/[0.06] p-3.5" role="region" aria-label={t("pendingAction.regionLabel")}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/20 bg-amber-200/10 text-amber-100">
          <Clock3 aria-hidden="true" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/75">{t("pendingAction.reviewRequired")}</p>
          <p className="mt-1 text-sm font-bold text-amber-50">{getActionDescription(action, t)}</p>
          {action.summary.components && action.summary.components.length > 0 && (
            <ul className="mt-2 space-y-1 text-[11px] text-amber-100/70">
              {action.summary.components.map((component) => (
                <li key={`${component.slot}-${component.id}`} className="truncate">
                  <span className="font-bold text-amber-100">{slotLabels[component.slot] ?? component.slot}:</span> {component.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-amber-100/55">{t("pendingAction.expirationNotice")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-100 px-3 text-[11px] font-bold text-black transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 disabled:cursor-wait disabled:opacity-50"
            >
              <Check aria-hidden="true" size={14} />
              {isConfirming ? t("pendingAction.confirming") : t("pendingAction.confirm")}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-100/20 px-3 text-[11px] font-bold text-amber-100/80 transition-colors hover:border-amber-100/40 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 disabled:opacity-50"
            >
              <X aria-hidden="true" size={14} />
              {t("pendingAction.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
