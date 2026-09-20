"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslations } from "next-intl";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; theme: "dark" }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileChallengeProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

const SCRIPT_ID = "corex-turnstile-script";

export default function TurnstileChallenge({ siteKey, onVerify, onExpire, onError }: TurnstileChallengeProps) {
  const t = useTranslations("ai");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const handleVerify = useEffectEvent((token: string) => onVerify(token));
  const handleExpire = useEffectEvent(() => onExpire());
  const handleError = useEffectEvent(() => onError());

  useEffect(() => {
    let isActive = true;
    const render = () => {
      if (!isActive || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: handleVerify,
        "expired-callback": handleExpire,
        "error-callback": handleError,
        theme: "dark",
      });
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (window.turnstile) render();
    else if (existingScript) existingScript.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      isActive = false;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
    };
  }, [siteKey]);

  return <div ref={containerRef} aria-label={t("turnstile.label")} />;
}
