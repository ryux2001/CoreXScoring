"use client";

import { Check, Clock3, X } from "lucide-react";
import type { PendingAction } from "@/lib/ai/types";

interface PendingActionCardProps {
  action: PendingAction;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SLOT_LABELS: Record<string, string> = {
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  motherboard: "Placa base",
  storage: "Almacenamiento",
  psu: "Fuente",
};

function getActionDescription(action: PendingAction): string {
  if (action.type === "set_custom_price") {
    return `Cambiar ${SLOT_LABELS[action.summary.slot ?? ""] ?? action.summary.slot} a ${action.summary.price ?? 0} ${action.summary.currency ?? "USD"}`;
  }

  return `${action.type === "create_combo" ? "Crear combo" : "Crear build"} «${action.summary.entityTitle ?? action.title}»`;
}

export default function PendingActionCard({ action, isConfirming, onConfirm, onCancel }: PendingActionCardProps) {
  return (
    <div className="mx-4 rounded-2xl border border-amber-200/25 bg-amber-200/[0.06] p-3.5" role="region" aria-label="Acción pendiente de confirmación">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/20 bg-amber-200/10 text-amber-100">
          <Clock3 aria-hidden="true" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/75">Revisión necesaria</p>
          <p className="mt-1 text-sm font-bold text-amber-50">{getActionDescription(action)}</p>
          {action.summary.components && action.summary.components.length > 0 && (
            <ul className="mt-2 space-y-1 text-[11px] text-amber-100/70">
              {action.summary.components.map((component) => (
                <li key={`${component.slot}-${component.id}`} className="truncate">
                  <span className="font-bold text-amber-100">{SLOT_LABELS[component.slot] ?? component.slot}:</span> {component.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-amber-100/55">La propuesta caduca en unos minutos y aún no ha modificado tu bóveda.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-100 px-3 text-[11px] font-bold text-black transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 disabled:cursor-wait disabled:opacity-50"
            >
              <Check aria-hidden="true" size={14} />
              {isConfirming ? "Confirmando…" : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-100/20 px-3 text-[11px] font-bold text-amber-100/80 transition-colors hover:border-amber-100/40 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 disabled:opacity-50"
            >
              <X aria-hidden="true" size={14} />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
