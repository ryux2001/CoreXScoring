"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  Bot,
  ChevronDown,
  LoaderCircle,
  Maximize2,
  Minimize2,
  SendHorizontal,
  Square,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { BuildDraft, ChatMessage, ChatResponse, ComboDraft, PendingAction } from "@/lib/ai/types";
import { ensureAiSession } from "@/lib/ai/client-session";
import PendingActionCard from "./PendingActionCard";

type MobileMode = "collapsed" | "compact" | "expanded";
type ChatError = { message: string; retryable: boolean; retryAfterSeconds?: number };
type ChatErrorPayload = { error?: string; code?: string; retryable?: boolean; requestId?: string; retryAfterSeconds?: number };

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hola, soy CoreX AI, tu asistente de hardware. Puedo ayudarte con componentes, compatibilidad, rendimiento y el uso de CoreXScoring.",
};
const MOBILE_TOAST_MAX_LENGTH = 120;

const markdownComponents: Components = {
  a: ({ children, href, title }) => (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noreferrer noopener"
      className="font-semibold text-cyan-200 underline decoration-cyan-200/50 underline-offset-2 transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
    >
      {children}
    </a>
  ),
};

function getMobileToastPreview(content: string): string {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  if (normalizedContent.length <= MOBILE_TOAST_MAX_LENGTH) return normalizedContent;

  return `${normalizedContent.slice(0, MOBILE_TOAST_MAX_LENGTH).trimEnd()}...`;
}

function findFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute("inert"));
}

interface ChatPanelProps {
  id: string;
  messages: ChatMessage[];
  draft: string;
  error: ChatError | null;
  isSending: boolean;
  canContinue: boolean;
  provider: ChatResponse["provider"] | null;
  model: string | null;
  sessionKind: "anonymous" | "authenticated" | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRetry: () => void;
  onContinue: () => void;
  pendingAction: PendingAction | null;
  isConfirmingAction: boolean;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onMinimize?: () => void;
  onExpand?: () => void;
  onReduce?: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  expandButtonRef?: RefObject<HTMLButtonElement | null>;
}

function ChatPanel({
  id,
  messages,
  draft,
  error,
  isSending,
  canContinue,
  provider,
  model,
  sessionKind,
  onDraftChange,
  onSend,
  onStop,
  onRetry,
  onContinue,
  pendingAction,
  isConfirmingAction,
  onConfirmAction,
  onCancelAction,
  onMinimize,
  onExpand,
  onReduce,
  inputRef,
  expandButtonRef,
}: ChatPanelProps) {
  const hasActions = Boolean(onMinimize || onExpand || onReduce);

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Conversación con CoreX AI">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_8px_28px_rgba(34,211,238,0.12)]">
            <Bot aria-hidden="true" size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display truncate text-base font-bold tracking-tight text-white">CoreX AI</h2>
            <p className="font-technical text-[12px] text-zinc-500 font-extrabold">
              {sessionKind === "anonymous"
                ? "Modo invitado · hardware"
                : provider === "local"
                ? "Modelo local · llama.cpp"
                : provider === "cerebras"
                ? "Cerebras · respaldo"
                : provider === "openrouter"
                ? "OpenRouter · respaldo"
                : provider === "guardrail" && model === "vault-direct-v1"
                  ? "Bóveda · datos privados"
                : provider === "guardrail"
                  ? "CoreX AI · alcance protegido"
                  : provider === "groq"
                    ? "Groq · principal"
                    : "Hardware · asistente especializado"}
            </p>
          </div>
        </div>

        {hasActions && (
          <div className="flex shrink-0 items-center gap-1">
            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                ref={expandButtonRef}
                aria-label="Expandir chat"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <Maximize2 aria-hidden="true" size={16} />
              </button>
            )}
            {onReduce && (
              <button
                type="button"
                onClick={onReduce}
                aria-label="Reducir chat"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <ChevronDown aria-hidden="true" size={18} />
              </button>
            )}
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                aria-label="Minimizar chat"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <Minimize2 aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        )}
      </header>

      <div id={id} className="ai-chat-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl border px-3.5 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "border-cyan-500/60 bg-cyan-950/35 text-cyan-100 shadow-[0_8px_20px_rgba(8,145,178,0.12)]"
                  : "border-white/10 bg-zinc-900/80 text-zinc-200"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="[&_p]:m-0 [&_p+p]:mt-3 [&_strong]:font-bold [&_em]:italic [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:my-3 [&_blockquote]:rounded-r-lg [&_blockquote]:bg-cyan-300/5 [&_blockquote]:pl-3 [&_blockquote]:text-cyan-100 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/70 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-black/30 [&_code]:px-1 [&_code]:py-0.5 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                  <ReactMarkdown skipHtml components={markdownComponents}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start" aria-label="CoreX AI está escribiendo">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-3.5 py-3 text-xs text-zinc-400">
              <LoaderCircle aria-hidden="true" className="animate-spin text-cyan-200" size={15} />
              Pensando…
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-100">
            <span>{error.message}</span>
            {error.retryable && (
              error.retryAfterSeconds && error.retryAfterSeconds > 0 ? (
                <span className="ml-1 font-semibold text-red-50">
                  Reintenta en {error.retryAfterSeconds} s.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onRetry}
                  className="ml-2 font-bold text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Reintentar
                </button>
              )
            )}
          </div>
        )}

        {canContinue && !isSending && !pendingAction && (
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-left text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            La respuesta se cortó por longitud. Continuar respuesta
          </button>
        )}
      </div>

      {pendingAction && (
        <PendingActionCard
          action={pendingAction}
          isConfirming={isConfirmingAction}
          onConfirm={onConfirmAction}
          onCancel={onCancelAction}
        />
      )}

      <form
        className="border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label className="sr-only" htmlFor={`${id}-input`}>Escribe un mensaje para CoreX AI</label>
        <div className="flex items-end gap-2 rounded-2xl border border-zinc-700 bg-black px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition-colors focus-within:border-cyan-200/70">
          <textarea
            ref={inputRef}
            id={`${id}-input`}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            rows={1}
            maxLength={2_000}
            placeholder="Escribe…"
            className="font-technical max-h-28 min-h-8 flex-1 resize-none bg-transparent py-1 text-sm text-white outline-none placeholder:text-zinc-600"
          />
          {isSending ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Detener respuesta"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-700 text-white transition-colors hover:bg-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              <Square aria-hidden="true" size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Enviar mensaje"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <SendHorizontal aria-hidden="true" size={16} />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[10px] leading-relaxed text-zinc-600">La IA puede equivocarse. Verifica datos importantes.</p>
      </form>
    </section>
  );
}

export default function AISidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<ChatError | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [provider, setProvider] = useState<ChatResponse["provider"] | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [sessionKind, setSessionKind] = useState<"anonymous" | "authenticated" | null>(null);
  const [mobileMode, setMobileMode] = useState<MobileMode>("collapsed");
  const [isMobileToastVisible, setIsMobileToastVisible] = useState(true);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [buildDraft, setBuildDraft] = useState<BuildDraft | null>(null);
  const [comboDraft, setComboDraft] = useState<ComboDraft | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef("");
  const mobileInputRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const mobileExpandButtonRef = useRef<HTMLButtonElement>(null);
  const expandedPanelRef = useRef<HTMLDivElement>(null);

  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const lastAssistantContent = lastAssistantMessage?.content;
  const mobileToastPreview = lastAssistantContent
    ? getMobileToastPreview(lastAssistantContent)
    : null;

  useEffect(() => {
    const retryAfterSeconds = error?.retryAfterSeconds;
    if (!retryAfterSeconds || retryAfterSeconds <= 0) return;

    const deadline = Date.now() + retryAfterSeconds * 1_000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
      setError((currentError) => (
        currentError ? { ...currentError, retryAfterSeconds: remaining } : currentError
      ));
    }, 250);

    return () => window.clearInterval(timer);
  }, [error?.retryAfterSeconds]);

  const sendMessage = async (rawMessage = draft, isRetry = false) => {
    const content = rawMessage.trim();
    if (!content || isSending) return;

    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = isRetry ? messages : [...messages, userMessage];
    lastMessageRef.current = content;
    if (!isRetry) {
      setMessages(nextMessages);
      setDraft("");
      setCanContinue(false);
    }
    setError(null);
    setIsSending(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const session = await ensureAiSession();
      setSessionKind(session.user.is_anonymous === true ? "anonymous" : "authenticated");

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12),
          context: {
            pathname: window.location.pathname,
            search: window.location.search,
            title: document.title,
          },
          ...(buildDraft ? { buildDraft } : {}),
          ...(comboDraft ? { comboDraft } : {}),
        }),
        signal: controller.signal,
      });
      const payload = await response.json() as ChatResponse | ChatErrorPayload;

      if (!response.ok || !("message" in payload)) {
        const errorPayload = payload as ChatErrorPayload;
        const retryAfterHeader = Number(response.headers.get("Retry-After"));
        const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? Math.ceil(retryAfterHeader)
          : errorPayload.retryAfterSeconds;
        console.error("CoreX AI chat request failed", {
          requestId: errorPayload.requestId || response.headers.get("X-CoreX-AI-Request-Id"),
          status: response.status,
          code: errorPayload.code || "unknown_error",
          retryable: errorPayload.retryable !== false,
          retryAfterSeconds,
        });
        setError({
          message: errorPayload.error || "No se pudo obtener una respuesta.",
          retryable: errorPayload.retryable !== false,
          retryAfterSeconds,
        });
        return;
      }

      setMessages((currentMessages) => [...currentMessages, payload.message]);
      setProvider(payload.provider);
      setModel(payload.model);
      // Cada respuesta exitosa reemplaza el estado de confirmación anterior.
      // Si una recomendación no trae pendingAction, no debe quedar visible una
      // tarjeta antigua de otro build/combo.
      setPendingAction(payload.pendingAction ?? null);
      if (payload.buildDraft) {
        setBuildDraft(payload.buildDraft);
        setComboDraft(null);
      }
      if (payload.comboDraft) {
        setComboDraft(payload.comboDraft);
        setBuildDraft(null);
      }
      setCanContinue(payload.truncated === true && !payload.pendingAction);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      console.error("CoreX AI chat network error", {
        name: requestError instanceof Error ? requestError.name : "unknown_error",
        message: requestError instanceof Error ? requestError.message : "No se pudo conectar con el asistente.",
      });
      setError({
        message: requestError instanceof Error ? requestError.message : "No se pudo conectar con el asistente.",
        retryable: true,
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsSending(false);
      }
    }
  };

  const confirmAction = async () => {
    if (!pendingAction || isSending || isConfirmingAction) return;
    setError(null);
    setIsConfirmingAction(true);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.slice(-12),
          action: { id: pendingAction.id, digest: pendingAction.digest },
        }),
      });
      const payload = await response.json() as ChatResponse | ChatErrorPayload;
      if (!response.ok || !("message" in payload)) {
        const errorPayload = payload as ChatErrorPayload;
        console.error("CoreX AI action confirmation failed", {
          requestId: errorPayload.requestId || response.headers.get("X-CoreX-AI-Request-Id"),
          status: response.status,
          code: errorPayload.code || "unknown_error",
        });
        setError({
          message: errorPayload.error || "No se pudo confirmar la acción.",
          retryable: false,
        });
        return;
      }
      setMessages((currentMessages) => [...currentMessages, payload.message]);
      setProvider(payload.provider);
      setModel(payload.model);
      setPendingAction(null);
      setBuildDraft(null);
      setComboDraft(null);
    } catch (requestError) {
      console.error("CoreX AI action confirmation network error", {
        name: requestError instanceof Error ? requestError.name : "unknown_error",
        message: requestError instanceof Error ? requestError.message : "No se pudo confirmar la acción.",
      });
      setError({
        message: requestError instanceof Error ? requestError.message : "No se pudo confirmar la acción.",
        retryable: false,
      });
    } finally {
      setIsConfirmingAction(false);
      setIsSending(false);
    }
  };

  const cancelAction = () => {
    if (isConfirmingAction) return;
    setPendingAction(null);
    setMessages((currentMessages) => [...currentMessages, {
      role: "assistant",
      content: "No se realizó ningún cambio en tu bóveda.",
    }]);
  };

  const stopResponse = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSending(false);
  };

  const continueResponse = () => {
    void sendMessage(
      "Continúa exactamente tu respuesta anterior desde donde se interrumpió. No repitas contenido ni ejecutes acciones o tools.",
    );
  };

  const collapseMobileChat = () => {
    setMobileMode("collapsed");
    window.requestAnimationFrame(() => bubbleRef.current?.focus());
  };

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  useEffect(() => {
    if (!lastAssistantContent) return;

    setIsMobileToastVisible(true);
    const timer = window.setTimeout(() => setIsMobileToastVisible(false), 5_000);
    return () => window.clearTimeout(timer);
  }, [lastAssistantContent]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const syncVisualViewport = () => {
      const nextViewportHeight = Math.round(viewport.height);
      const nextKeyboardInset = Math.max(
        0,
        Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
      );

      setMobileViewportHeight((currentHeight) => (
        currentHeight === nextViewportHeight ? currentHeight : nextViewportHeight
      ));
      setKeyboardInset((currentInset) => (
        currentInset === nextKeyboardInset ? currentInset : nextKeyboardInset
      ));
    };

    syncVisualViewport();
    viewport.addEventListener("resize", syncVisualViewport);
    viewport.addEventListener("scroll", syncVisualViewport);
    return () => {
      viewport.removeEventListener("resize", syncVisualViewport);
      viewport.removeEventListener("scroll", syncVisualViewport);
    };
  }, []);

  useEffect(() => {
    if (mobileMode === "collapsed") return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMobileMode("collapsed");
      window.requestAnimationFrame(() => bubbleRef.current?.focus());
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMode]);

  useEffect(() => {
    if (mobileMode !== "expanded") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    expandedPanelRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !expandedPanelRef.current) return;
      const focusable = findFocusableElements(expandedPanelRef.current);
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (!expandedPanelRef.current.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMode]);

  const sharedPanelProps = {
    messages,
    draft,
    error,
    isSending,
    canContinue,
    provider,
    model,
    sessionKind,
    onDraftChange: setDraft,
    onSend: () => void sendMessage(),
    onStop: stopResponse,
    onRetry: () => void sendMessage(lastMessageRef.current, true),
    onContinue: continueResponse,
    pendingAction,
    isConfirmingAction,
    onConfirmAction: () => void confirmAction(),
    onCancelAction: cancelAction,
  };

  const mobilePanelBottom = keyboardInset > 0
    ? `calc(${keyboardInset}px + max(0.75rem, env(safe-area-inset-bottom)))`
    : "max(0.75rem, env(safe-area-inset-bottom))";
  const compactPanelStyle: CSSProperties = {
    bottom: mobilePanelBottom,
    ...(mobileViewportHeight
      ? { height: `${Math.min(368, Math.max(208, mobileViewportHeight - 88))}px` }
      : {}),
  };
  const expandedPanelStyle: CSSProperties = { bottom: mobilePanelBottom };
  const reduceMobileChat = () => {
    setMobileMode("compact");
    window.requestAnimationFrame(() => mobileExpandButtonRef.current?.focus());
  };

  return (
    <>
      <aside className="fixed bottom-0 right-0 top-[81px] z-40 hidden w-80 border-l border-white/10 bg-zinc-950/95 shadow-[-20px_0_55px_rgba(0,0,0,0.28)] backdrop-blur-xl md:flex lg:w-[22.5rem]">
        <ChatPanel id="desktop-ai-chat" {...sharedPanelProps} />
      </aside>

      <div className="md:hidden">
        {mobileMode === "collapsed" && isMobileToastVisible && mobileToastPreview && (
          <button
            type="button"
            onClick={() => setMobileMode("compact")}
            className="fixed bottom-24 right-4 z-50 max-h-[4.5rem] w-56 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 px-4 py-3 text-left text-xs leading-relaxed text-zinc-300 shadow-[0_14px_36px_rgba(0,0,0,0.4)] backdrop-blur transition hover:border-cyan-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            aria-label="Abrir la última respuesta de CoreX AI"
          >
            <span className="font-display mr-1 text-cyan-100">CoreX AI</span>
            {mobileToastPreview}
          </button>
        )}

        {mobileMode === "collapsed" && (
          <button
            ref={bubbleRef}
            type="button"
            onClick={() => setMobileMode("compact")}
            aria-label="Abrir CoreX AI"
            className="fixed bottom-4 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/30 bg-zinc-950 text-cyan-100 shadow-[0_12px_32px_rgba(8,145,178,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <Bot aria-hidden="true" size={23} strokeWidth={1.8} />
          </button>
        )}

        {mobileMode === "compact" && (
          <div style={compactPanelStyle} className="fixed inset-x-3 z-50 flex h-[min(23rem,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-3xl border border-white/15 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <ChatPanel
              id="mobile-compact-ai-chat"
              {...sharedPanelProps}
              inputRef={mobileInputRef}
              expandButtonRef={mobileExpandButtonRef}
              onExpand={() => setMobileMode("expanded")}
              onMinimize={collapseMobileChat}
            />
          </div>
        )}

        {mobileMode === "expanded" && (
          <div style={expandedPanelStyle} className="fixed inset-x-3 top-[72px] z-[60] flex overflow-hidden rounded-3xl border border-white/15 bg-zinc-950 shadow-[0_28px_80px_rgba(0,0,0,0.62)]" role="dialog" aria-modal="true" aria-label="CoreX AI">
            <div ref={expandedPanelRef} tabIndex={-1} className="flex min-h-0 flex-1 outline-none">
              <ChatPanel
                id="mobile-expanded-ai-chat"
                {...sharedPanelProps}
                inputRef={mobileInputRef}
                onReduce={reduceMobileChat}
                onMinimize={collapseMobileChat}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
