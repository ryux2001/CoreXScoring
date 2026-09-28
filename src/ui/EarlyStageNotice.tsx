"use client";

import { ShieldAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "corex-early-stage-notice-v1";
const subscribeToDismissal = () => () => {};
const getServerDismissalStatus = () => false;

function getDismissalStatus() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

export default function EarlyStageNotice() {
  const t = useTranslations("earlyStageNotice");
  const wasDismissed = useSyncExternalStore(
    subscribeToDismissal,
    getDismissalStatus,
    getServerDismissalStatus,
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // Keep the notice dismissible when browser storage is unavailable.
    }
    setIsDismissed(true);
  };
  const dismissFromKeyboard = useEffectEvent(dismiss);
  const isOpen = !wasDismissed && !isDismissed;

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));

    window.requestAnimationFrame(() => focusable()[0]?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissFromKeyboard();
        return;
      }

      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("close")}
        className="absolute inset-0 cursor-default"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="early-stage-notice-title"
        aria-describedby="early-stage-notice-description"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl border border-cyan-200/20 bg-zinc-950 shadow-[0_24px_100px_rgba(0,0,0,0.65)] sm:max-h-[calc(100vh-3rem)]"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-7">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
              <ShieldAlert aria-hidden="true" size={21} />
            </div>
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200/75">{t("eyebrow")}</p>
              <h2 id="early-stage-notice-title" className="mt-1 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">{t("title")}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("close")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div id="early-stage-notice-description" className="space-y-4 p-5 font-technical text-sm leading-relaxed text-zinc-300 sm:p-7">
          <p>{t("introduction")}</p>
          <p>{t("progress")}</p>
          <p>{t("contact")}</p>
          <p className="pt-1 text-zinc-500">{t("signature")}</p>
        </div>

        <footer className="border-t border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <button
            type="button"
            onClick={dismiss}
            className="font-display min-h-11 w-full rounded-xl bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {t("dismiss")}
          </button>
        </footer>
      </section>
    </div>
  );
}
