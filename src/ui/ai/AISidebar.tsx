"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronDown,
  History,
  Info,
  Maximize2,
  Minimize2,
  PanelRightClose,
  RefreshCw,
  SendHorizontal,
  Square,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { AiFrontendPriceContext, BuildDraft, ChatMessage, ChatResponse, ComboDraft, ComparisonUiAction, ConversationRecord, ConversationSummary, AiConversationMode, PageContext, PendingAction } from "@/lib/ai/types";
import { ensureAiSession } from "@/lib/ai/client-session";
import PendingActionCard from "./PendingActionCard";
import ChatHistoryPanel from "./ChatHistoryPanel";
import { useCatalogPriceEvaluationStore } from "@/store/useCatalogPriceEvaluationStore";
import { useCompareStore, type CompareProduct } from "@/store/useCompareStore";
import { useAiVisiblePriceStore } from "@/store/useAiVisiblePriceStore";
import type { AiQuotaStatus } from "@/lib/ai/limits";

type MobileMode = "collapsed" | "compact" | "expanded";
type ChatError = { message: string; retryable: boolean; retryAfterSeconds?: number };
type ChatErrorPayload = { error?: string; code?: string; retryable?: boolean; requestId?: string; retryAfterSeconds?: number };

const QUICK_PROMPTS = [
  "¿Qué puedes hacer por mí?",
  "Quiero información de un componente",
  "Recomiéndame una build",
  "¿Qué es CoreXScoring?",
] as const;
const MOBILE_TOAST_MAX_LENGTH = 120;
const INPUT_MIN_HEIGHT = 36;
const INPUT_MAX_HEIGHT = 112;
const DESKTOP_CHAT_MIN_WIDTH = 420;
const DESKTOP_CHAT_MAX_WIDTH = 580;
const DESKTOP_CHAT_INITIAL_WIDTH = 400;

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

function formatQuotaNumber(value: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
}

function formatQuotaReset(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "al finalizar el día";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function getCurrentClientPageContext(comparisonItems: CompareProduct[]): PageContext {
  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0];
  const route: PageContext["route"] = root === "catalog"
    ? "catalog"
    : root === "combos"
      ? "combo"
      : root === "builds"
        ? "build"
        : root === "comparator"
          ? "comparator"
          : root === "vault"
            ? "vault"
            : root ? "other" : "home";
  const identifier = root === "vault" ? segments[2] || segments[1] : route === "comparator" ? undefined : segments[1];
  return {
    pathname,
    search: window.location.search,
    title: document.title,
    route,
    ...(identifier ? { identifier } : {}),
    ...(route === "comparator" && comparisonItems.length > 0
      ? { comparison: { itemIds: comparisonItems.map((item) => String(item.id)).slice(0, 3) } }
      : {}),
  };
}

function getFrontendPriceContext(
  pathname: string,
  comparisonItems: CompareProduct[],
  evaluatedPrices: Record<string, number>,
  visibleEditorContext: AiFrontendPriceContext | null,
): AiFrontendPriceContext | undefined {
  if (pathname.startsWith("/comparator")) {
    const visibleIds = new Set(comparisonItems.map((item) => String(item.id)));
    const items = Object.entries(evaluatedPrices)
      .filter(([productId]) => visibleIds.has(productId))
      .map(([productId, price]) => ({ productId, price, isCustom: true }));
    if (items.length > 0) {
      return { scope: "comparison", currency: new URLSearchParams(window.location.search).get("currency") === "EUR" ? "EUR" : "USD", items };
    }
  }

  if (visibleEditorContext && pathname.startsWith("/vault/")) return visibleEditorContext;

  return undefined;
}

function humanizePageIdentifier(value: string): string {
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* conserva el slug original */ }
  return decoded
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bamd\b/gi, "AMD")
    .replace(/\bintel\b/gi, "Intel")
    .replace(/\bryzen\b/gi, "Ryzen")
    .replace(/\brtx\b/gi, "RTX")
    .replace(/\bgtx\b/gi, "GTX")
    .replace(/\b(\w)/g, (character) => character.toUpperCase());
}

function getPageStatusLabel(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0];
  const identifier = root === "vault" ? segments[2] : segments[1];
  if (root === "catalog" && identifier) return `${humanizePageIdentifier(identifier)}`;
  if (root === "combos" && identifier) return `Combo: ${humanizePageIdentifier(identifier)}`;
  if (root === "builds" && identifier) return `Build: ${humanizePageIdentifier(identifier)}`;
  if (root === "vault" && segments[1] === "combos-created" && identifier) return `Combo creado: ${humanizePageIdentifier(identifier)}`;
  if (root === "vault" && segments[1] === "builds-created" && identifier) return `Build creada: ${humanizePageIdentifier(identifier)}`;
  if (root === "catalog") return "Catálogo";
  if (root === "combos") return "Combos";
  if (root === "builds") return "Builds";
  if (root === "comparator") return "Comparador";
  if (root === "vault") return "Bóveda";
  return "Inicio";
}

function findFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute("inert"));
}

function ThinkingWave() {
  return (
    <span className="ai-thinking-wave" aria-hidden="true">
      {Array.from("Pensando…").map((character, index) => (
        <span
          key={`${character}-${index}`}
          style={{ "--ai-wave-delay": `${index * 72}ms` } as CSSProperties}
        >
          {character}
        </span>
      ))}
    </span>
  );
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
  pageStatus: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onQuickPrompt: (prompt: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onContinue: () => void;
  pendingAction: PendingAction | null;
  isConfirmingAction: boolean;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onMinimize?: () => void;
  onHideDesktop?: () => void;
  onExpand?: () => void;
  onReduce?: () => void;
  onOpenHistory: () => void;
  conversationMode: AiConversationMode;
  conversationTitle?: string;
  quota: AiQuotaStatus | null;
  quotaState: "idle" | "loading" | "ready" | "error";
  isQuotaOpen: boolean;
  onToggleQuota: () => void;
  onRefreshQuota: () => void;
  pageStatusMaxWidth?: number;
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
  pageStatus,
  onDraftChange,
  onSend,
  onQuickPrompt,
  onStop,
  onRetry,
  onContinue,
  pendingAction,
  isConfirmingAction,
  onConfirmAction,
  onCancelAction,
  onMinimize,
  onHideDesktop,
  onExpand,
  onReduce,
  onOpenHistory,
  conversationMode,
  conversationTitle,
  quota,
  quotaState,
  isQuotaOpen,
  onToggleQuota,
  onRefreshQuota,
  pageStatusMaxWidth,
  inputRef,
  expandButtonRef,
}: ChatPanelProps) {
  const hasActions = Boolean(onMinimize || onExpand || onReduce || onOpenHistory || onHideDesktop);

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Conversación con CoreX AI">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/95 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_8px_28px_rgba(34,211,238,0.12)]">
            <Bot aria-hidden="true" size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display truncate text-base font-bold tracking-tight text-white">{conversationTitle || "CoreX AI"}</h2>
            <p className="font-technical text-[12px] text-zinc-500 font-extrabold">
              {conversationMode === "temporary"
                ? "Chat temporal"
                : sessionKind === "anonymous"
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
                    : "Chat asistente"}
            </p>
            <p
              className="font-technical max-w-[13rem] truncate text-[10px] font-semibold text-cyan-200/75"
              style={pageStatusMaxWidth ? { maxWidth: `${pageStatusMaxWidth}px` } : undefined}
              title={pageStatus}
              aria-label={`Contexto actual: ${pageStatus}`}
            >
              {pageStatus}
            </p>
          </div>
        </div>

        {hasActions && (
          <div className="flex shrink-0 items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={onToggleQuota}
                aria-label="Ver límites de uso de CoreX AI"
                aria-expanded={isQuotaOpen}
                aria-controls={`${id}-quota`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <Info aria-hidden="true" size={16} />
              </button>
              {isQuotaOpen && (
                <div id={`${id}-quota`} role="dialog" aria-label="Límites de uso" className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-white/10 bg-zinc-900 p-3.5 text-left shadow-[0_16px_36px_rgba(0,0,0,0.42)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">Uso de CoreX AI</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">Tu cuota diaria personal.</p>
                    </div>
                    <button type="button" onClick={onRefreshQuota} disabled={quotaState === "loading"} aria-label="Actualizar cuota" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-50">
                      <RefreshCw aria-hidden="true" size={13} className={quotaState === "loading" ? "animate-spin" : ""} />
                    </button>
                  </div>
                  {quotaState === "loading" && !quota ? (
                    <div className="mt-3 space-y-2" aria-label="Cargando cuota">
                      <div className="h-9 animate-pulse rounded-lg bg-white/5" />
                      <div className="h-9 animate-pulse rounded-lg bg-white/5" />
                    </div>
                  ) : quota ? (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg bg-black/30 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Mensajes</p>
                        <p className="mt-0.5 text-sm font-bold text-cyan-100">{formatQuotaNumber(quota.messagesRemaining)} <span className="font-normal text-zinc-400">de {formatQuotaNumber(quota.messagesLimit)} restantes</span></p>
                      </div>
                      <div className="rounded-lg bg-black/30 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Tokens</p>
                        <p className="mt-0.5 text-sm font-bold text-cyan-100">{formatQuotaNumber(quota.tokensRemaining)} <span className="font-normal text-zinc-400">de {formatQuotaNumber(quota.tokensLimit)} restantes</span></p>
                      </div>
                      <p className="px-0.5 text-[10px] leading-relaxed text-zinc-500">Se reinicia {formatQuotaReset(quota.resetAt)}. Los límites compartidos de red pueden aplicarse antes.</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs leading-relaxed text-zinc-400">No se pudo cargar tu cuota. Puedes seguir usando el chat e intentarlo de nuevo.</p>
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={onOpenHistory} aria-label="Abrir historial de chats" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <History aria-hidden="true" size={16} />
            </button>
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
            {onHideDesktop && (
              <button
                type="button"
                onClick={onHideDesktop}
                aria-label="Ocultar CoreX AI en escritorio"
                className="hidden min-h-9 min-w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 md:inline-flex"
              >
                <PanelRightClose aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        )}
      </header>

      <div id={id} className="ai-chat-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-black px-4 py-5" aria-live="polite">
        {messages.length === 0 && !isSending && !error && (
          <div className="mx-auto flex w-full max-w-xl flex-col justify-center gap-3 py-4">
            <p className="font-display text-center text-lg font-bold tracking-tight text-white">¿En qué puedo ayudarte?</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPrompt(prompt)}
                  className="min-h-14 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-3 text-left font-technical text-xs leading-5 text-cyan-100/90 transition-colors hover:border-cyan-300/40 hover:bg-cyan-300/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`font-technical max-w-[90%] whitespace-pre-wrap rounded-2xl border px-4 py-3.5 text-sm leading-5 ${
                message.role === "user"
                  ? "border-cyan-500/60 bg-cyan-950/35 text-cyan-100 shadow-[0_8px_20px_rgba(8,145,178,0.12)]"
                  : "rounded-tl-md border-white/[0.08] bg-zinc-950/95 text-zinc-200 shadow-[0_10px_28px_rgba(0,0,0,0.16)]"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="[&_p]:m-0 [&_p+p]:mt-2 [&_h1]:mb-2 [&_h1]:font-technical [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:font-technical [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-1.5 [&_h3]:mt-2.5 [&_h3]:font-technical [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-cyan-100 [&_strong]:font-bold [&_strong]:text-white [&_em]:italic [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-cyan-300/15 [&_blockquote]:bg-cyan-300/5 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-cyan-100 [&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:bg-black/70 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-black/30 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-technical [&_code]:text-cyan-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
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
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-cyan-300/10 bg-zinc-900/75 px-4 py-3 text-xs text-zinc-400 shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
              <ThinkingWave />
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
        className="border-t border-white/10 bg-zinc-950/45 p-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label className="sr-only" htmlFor={`${id}-input`}>Escribe un mensaje para CoreX AI</label>
        <div className="flex items-end gap-2 rounded-[1.25rem] border border-zinc-800 bg-black/70 px-3.5 py-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow] focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.1),0_10px_28px_rgba(0,0,0,0.2)]">
          <textarea
            ref={inputRef}
            id={`${id}-input`}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onInput={(event) => {
              const input = event.currentTarget;
              input.style.height = "auto";
              const nextHeight = Math.min(Math.max(input.scrollHeight, INPUT_MIN_HEIGHT), INPUT_MAX_HEIGHT);
              input.style.height = `${nextHeight}px`;
              input.style.overflowY = input.scrollHeight > INPUT_MAX_HEIGHT ? "auto" : "hidden";
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            rows={1}
            maxLength={4_000}
            placeholder="Escribe…"
            className="ai-chat-input font-technical max-h-28 min-h-9 min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent py-2 text-sm leading-5 text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          {isSending ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Detener respuesta"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-cyan-100 transition-colors hover:border-cyan-500/35 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              <Square aria-hidden="true" size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Enviar mensaje"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-cyan-950 transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-cyan-100 disabled:opacity-100"
            >
              <SendHorizontal aria-hidden="true" size={16} />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[10px] leading-relaxed text-zinc-500">La IA puede equivocarse. Verifica datos importantes.</p>
      </form>
    </section>
  );
}

export default function AISidebar() {
  const pathname = usePathname() || "/";
  const comparisonItems = useCompareStore((state) => state.items);
  const evaluatedPrices = useCompareStore((state) => state.evaluatedPrices);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<ChatError | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [provider, setProvider] = useState<ChatResponse["provider"] | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [sessionKind, setSessionKind] = useState<"anonymous" | "authenticated" | null>(null);
  const [mobileMode, setMobileMode] = useState<MobileMode>("collapsed");
  const [isMobileToastVisible, setIsMobileToastVisible] = useState(false);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [buildDraft, setBuildDraft] = useState<BuildDraft | null>(null);
  const [comboDraft, setComboDraft] = useState<ComboDraft | null>(null);
  const [conversationMode, setConversationMode] = useState<AiConversationMode>("temporary");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [canSaveChats, setCanSaveChats] = useState(true);
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [quotaState, setQuotaState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const catalogPriceEvaluation = useCatalogPriceEvaluationStore((state) => state.current);
  const visibleEditorPriceContext = useAiVisiblePriceStore((state) => state.context);
  const applyCatalogPriceUpdate = useCatalogPriceEvaluationStore((state) => state.applyServerEvaluation);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [desktopPanelWidth, setDesktopPanelWidth] = useState(DESKTOP_CHAT_INITIAL_WIDTH);
  const [isDesktopVisible, setIsDesktopVisible] = useState(true);
  const [isDesktopResizing, setIsDesktopResizing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const desktopResizeStartRef = useRef<{ pointerId: number; clientX: number; width: number } | null>(null);
  const lastMessageRef = useRef("");
  const mobileInputRef = useRef<HTMLTextAreaElement>(null);
  const desktopInputRef = useRef<HTMLTextAreaElement>(null);
  const desktopShowButtonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const mobileExpandButtonRef = useRef<HTMLButtonElement>(null);
  const expandedPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ai-sidebar-width",
      isDesktopVisible ? `${desktopPanelWidth}px` : "0px",
    );
  }, [desktopPanelWidth, isDesktopVisible]);

  useEffect(() => () => {
    document.documentElement.style.removeProperty("--ai-sidebar-width");
  }, []);

  useEffect(() => {
    if (!isDesktopResizing) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isDesktopResizing]);

  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const lastAssistantContent = lastAssistantMessage?.content;
  const hasAssistantResponse = messages.some((message) => message.role === "assistant");
  const mobileToastPreview = lastAssistantContent
    ? getMobileToastPreview(lastAssistantContent)
    : null;
  const pageStatus = pathname.startsWith("/catalog/") && catalogPriceEvaluation
    ? `${getPageStatusLabel(pathname)} | Precio: ${catalogPriceEvaluation.price}${catalogPriceEvaluation.currency === "EUR" ? "€" : "$"} · C/P: ${catalogPriceEvaluation.qualityPriceScore.toFixed(2)}`
    : getPageStatusLabel(pathname);

  const applyComparisonAction = (action: ComparisonUiAction): string | null => {
    const comparisonStore = useCompareStore.getState();
    if (action.type === "replace") {
      const result = comparisonStore.applyComparisonSnapshot(action.items as unknown as CompareProduct[], action.evaluatedPrices);
      return result.success ? null : result.error || "No se pudo actualizar la comparación.";
    }
    if (action.type === "add") {
      const result = comparisonStore.addItem(action.item as unknown as CompareProduct);
      return result.success ? null : result.error || "No se pudo actualizar la comparación.";
    }

    const isPresent = comparisonStore.items.some((item) => String(item.id) === action.itemId);
    if (!isPresent) return "Ese componente ya no está en la comparación actual.";
    if (action.type === "set_price") {
      comparisonStore.setEvaluatedPrice(action.itemId, action.price);
      return null;
    }
    comparisonStore.removeItem(action.itemId);
    return null;
  };

  const loadQuota = async () => {
    setQuotaState("loading");
    try {
      const session = await ensureAiSession();
      setSessionKind(session.user.is_anonymous === true ? "anonymous" : "authenticated");
      const response = await fetch("/api/ai/quota", { cache: "no-store" });
      const payload = await response.json() as AiQuotaStatus | { error?: string };
      if (!response.ok || !("messagesRemaining" in payload)) throw new Error("quota_unavailable");
      setQuota(payload);
      setQuotaState("ready");
    } catch {
      setQuotaState("error");
    }
  };

  const toggleQuota = () => {
    setIsQuotaOpen((current) => {
      const next = !current;
      if (next) void loadQuota();
      return next;
    });
  };

  const resetConversation = (mode: AiConversationMode) => {
    setConversationMode(mode);
    setConversationId(null);
    setConversationTitle(undefined);
    setMessages([]);
    setDraft("");
    setError(null);
    setPendingAction(null);
    setBuildDraft(null);
    setComboDraft(null);
    setCanContinue(false);
  };

  const loadConversations = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/ai/conversations", { cache: "no-store" });
      const payload = await response.json() as { conversations?: ConversationSummary[]; canSave?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el historial.");
      setConversations(Array.isArray(payload.conversations) ? payload.conversations : []);
      setCanSaveChats(payload.canSave === true);
    } catch (requestError) {
      setHistoryError(requestError instanceof Error ? requestError.message : "No se pudo cargar el historial.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setIsHistoryOpen(true);
    void loadConversations();
  };

  const selectConversation = async (selectedId: string) => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/ai/conversations/${encodeURIComponent(selectedId)}`, { cache: "no-store" });
      const payload = await response.json() as { conversation?: ConversationRecord; error?: string };
      if (!response.ok || !payload.conversation) throw new Error(payload.error || "No se pudo cargar la conversación.");
      const selected = payload.conversation;
      setConversationMode("saved");
      setConversationId(selected.id);
      setConversationTitle(selected.title);
      setMessages(selected.messages.map(({ role, content }) => ({ role, content })));
      setBuildDraft(selected.state.buildDraft || null);
      setComboDraft(selected.state.comboDraft || null);
      setPendingAction(null);
      setCanContinue(false);
      setSessionKind("authenticated");
      setIsHistoryOpen(false);
    } catch (requestError) {
      setHistoryError(requestError instanceof Error ? requestError.message : "No se pudo cargar la conversación.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const startConversation = (mode: AiConversationMode) => {
    if (mode === "saved" && !canSaveChats) {
      setHistoryError("Inicia sesión para guardar conversaciones. El chat temporal sigue disponible.");
      return;
    }
    resetConversation(mode);
    setIsHistoryOpen(false);
  };

  const renameConversation = async (selectedId: string, title: string) => {
    const response = await fetch(`/api/ai/conversations/${encodeURIComponent(selectedId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error || "No se pudo renombrar el chat.");
    const normalizedTitle = title.trim().slice(0, 80);
    setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, title: normalizedTitle } : conversation));
    if (conversationId === selectedId) setConversationTitle(normalizedTitle);
  };

  const deleteConversation = async (conversation: ConversationSummary) => {
    const response = await fetch(`/api/ai/conversations/${encodeURIComponent(conversation.id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error || "No se pudo eliminar el chat.");
    setConversations((current) => current.filter((item) => item.id !== conversation.id));
    if (conversationId === conversation.id) resetConversation("temporary");
  };

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
      if (session.user.is_anonymous !== true) setCanSaveChats(true);

      const frontendPriceContext = getFrontendPriceContext(
        pathname,
        comparisonItems,
        evaluatedPrices,
        visibleEditorPriceContext,
      );
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12),
          conversationMode,
          ...(conversationId ? { conversationId } : {}),
          context: getCurrentClientPageContext(comparisonItems),
          ...(frontendPriceContext ? { frontendPriceContext } : {}),
          ...(buildDraft ? { buildDraft } : {}),
          ...(comboDraft ? { comboDraft } : {}),
          ...(catalogPriceEvaluation ? {
            catalogPriceEvaluation: {
              productId: catalogPriceEvaluation.productId,
              price: catalogPriceEvaluation.price,
              currency: catalogPriceEvaluation.currency,
              valueProfile: catalogPriceEvaluation.valueProfile,
              qualityPriceScore: catalogPriceEvaluation.qualityPriceScore,
              source: catalogPriceEvaluation.source,
            },
          } : {}),
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

      const comparisonActionError = payload.comparisonAction
        ? applyComparisonAction(payload.comparisonAction)
        : null;
      const responseMessage = comparisonActionError
        ? {
            role: "assistant" as const,
            content: `No pude actualizar la comparación: ${comparisonActionError}`,
          }
        : payload.message;
      setMessages((currentMessages) => [...currentMessages, responseMessage]);
      setProvider(payload.provider);
      setModel(payload.model);
      if (payload.conversationId) {
        setConversationId(payload.conversationId);
        setConversationMode("saved");
        if (!conversationTitle) setConversationTitle(content.slice(0, 80));
        void loadConversations();
      }
      // Cada respuesta exitosa reemplaza el estado de confirmación anterior.
      // Si una recomendación no trae pendingAction, no debe quedar visible una
      // tarjeta antigua de otro build/combo.
      setPendingAction(payload.pendingAction ?? null);
      if (payload.catalogPriceUpdate) {
        applyCatalogPriceUpdate(payload.catalogPriceUpdate);
      }
      if (payload.buildDraft) {
        setBuildDraft(payload.buildDraft);
        setComboDraft(null);
      }
      if (payload.comboDraft) {
        setComboDraft(payload.comboDraft);
        setBuildDraft(null);
      }
      if (comparisonActionError) {
        setError({ message: comparisonActionError, retryable: false });
      }
      setCanContinue(payload.truncated === true && !payload.pendingAction && !payload.comparisonAction);
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
      void loadQuota();
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
      void loadQuota();
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
    if (!lastAssistantContent || !hasAssistantResponse) return;

    setIsMobileToastVisible(true);
    const timer = window.setTimeout(() => setIsMobileToastVisible(false), 5_000);
    return () => window.clearTimeout(timer);
  }, [hasAssistantResponse, lastAssistantContent]);

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
    pageStatus,
    onDraftChange: setDraft,
    onSend: () => void sendMessage(),
    onQuickPrompt: (prompt: string) => void sendMessage(prompt),
    onStop: stopResponse,
    onRetry: () => void sendMessage(lastMessageRef.current, true),
    onContinue: continueResponse,
    pendingAction,
    isConfirmingAction,
    onConfirmAction: () => void confirmAction(),
    onCancelAction: cancelAction,
    onOpenHistory: openHistory,
    conversationMode,
    conversationTitle,
    quota,
    quotaState,
    isQuotaOpen,
    onToggleQuota: toggleQuota,
    onRefreshQuota: () => void loadQuota(),
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

  const beginDesktopResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    desktopResizeStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      width: desktopPanelWidth,
    };
    setIsDesktopResizing(true);
  };

  const updateDesktopResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = desktopResizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const nextWidth = start.width - (event.clientX - start.clientX);
    setDesktopPanelWidth(Math.min(DESKTOP_CHAT_MAX_WIDTH, Math.max(DESKTOP_CHAT_MIN_WIDTH, nextWidth)));
  };

  const endDesktopResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = desktopResizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    desktopResizeStartRef.current = null;
    setIsDesktopResizing(false);
  };

  const resizeDesktopWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 16;
    let nextWidth: number | null = null;
    if (event.key === "ArrowLeft") nextWidth = desktopPanelWidth + step;
    if (event.key === "ArrowRight") nextWidth = desktopPanelWidth - step;
    if (event.key === "Home") nextWidth = DESKTOP_CHAT_MIN_WIDTH;
    if (event.key === "End") nextWidth = DESKTOP_CHAT_MAX_WIDTH;
    if (nextWidth === null) return;

    event.preventDefault();
    setDesktopPanelWidth(Math.min(DESKTOP_CHAT_MAX_WIDTH, Math.max(DESKTOP_CHAT_MIN_WIDTH, nextWidth)));
  };

  const hideDesktopChat = () => {
    setIsDesktopVisible(false);
    window.requestAnimationFrame(() => desktopShowButtonRef.current?.focus());
  };

  const showDesktopChat = () => {
    setIsDesktopVisible(true);
    window.requestAnimationFrame(() => desktopInputRef.current?.focus());
  };
  const desktopPageStatusMaxWidth = Math.min(360, Math.max(208, desktopPanelWidth - 212));

  return (
    <>
      {isDesktopVisible ? (
        <aside
          className={`fixed bottom-0 right-0 top-[81px] z-40 hidden border-l border-white/10 bg-zinc-950/95 backdrop-blur-xl xl:flex ${isDesktopResizing ? "select-none" : ""}`}
          style={{ width: `${desktopPanelWidth}px` }}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Ajustar el ancho del chat"
            aria-valuemin={DESKTOP_CHAT_MIN_WIDTH}
            aria-valuemax={DESKTOP_CHAT_MAX_WIDTH}
            aria-valuenow={desktopPanelWidth}
            tabIndex={0}
            onPointerDown={beginDesktopResize}
            onPointerMove={updateDesktopResize}
            onPointerUp={endDesktopResize}
            onPointerCancel={endDesktopResize}
            onKeyDown={resizeDesktopWithKeyboard}
            className="group absolute inset-y-0 left-0 z-20 hidden w-3 -translate-x-1/2 cursor-ew-resize touch-none xl:block"
          >
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-1/2 w-px transition-colors ${isDesktopResizing ? "bg-cyan-300/70" : "bg-transparent group-hover:bg-cyan-300/50 group-focus-visible:bg-cyan-300/70"}`}
            />
          </div>
          {isHistoryOpen ? (
            <ChatHistoryPanel
              conversations={conversations}
              activeConversationId={conversationId}
              mode={conversationMode}
              isLoading={isHistoryLoading}
              error={historyError}
              canSave={canSaveChats}
              onClose={() => setIsHistoryOpen(false)}
              onSelect={(id) => void selectConversation(id)}
              onNew={startConversation}
              onRename={renameConversation}
              onDelete={deleteConversation}
            />
          ) : <ChatPanel id="desktop-ai-chat" {...sharedPanelProps} inputRef={desktopInputRef} pageStatusMaxWidth={desktopPageStatusMaxWidth} onHideDesktop={hideDesktopChat} />}
        </aside>
      ) : (
        <button
          ref={desktopShowButtonRef}
          type="button"
          onClick={showDesktopChat}
          aria-label="Mostrar CoreX AI en escritorio"
          className="group fixed right-0 top-24 z-40 hidden h-12 items-center gap-2 rounded-l-xl border border-r-0 border-cyan-200/25 bg-zinc-950/95 py-1.5 pl-2 pr-3 text-cyan-100 shadow-[-8px_8px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-[background-color,border-color,box-shadow] hover:border-cyan-200/45 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 xl:inline-flex"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-300/10 text-cyan-100 transition-colors group-hover:bg-cyan-300/15">
            <Bot aria-hidden="true" size={17} strokeWidth={1.8} />
          </span>
          <span className="font-display text-[11px] font-bold tracking-wide text-white">CoreX AI</span>
        </button>
      )}

      <div className="xl:hidden">
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
            {isHistoryOpen ? (
              <ChatHistoryPanel
                conversations={conversations}
                activeConversationId={conversationId}
                mode={conversationMode}
                isLoading={isHistoryLoading}
                error={historyError}
                canSave={canSaveChats}
                onClose={() => setIsHistoryOpen(false)}
                onSelect={(id) => void selectConversation(id)}
                onNew={startConversation}
                onRename={renameConversation}
                onDelete={deleteConversation}
              />
            ) : <ChatPanel id="mobile-compact-ai-chat" {...sharedPanelProps} inputRef={mobileInputRef} expandButtonRef={mobileExpandButtonRef} onExpand={() => setMobileMode("expanded")} onMinimize={collapseMobileChat} />}
          </div>
        )}

        {mobileMode === "expanded" && (
          <div style={expandedPanelStyle} className="fixed inset-x-3 top-[72px] z-[60] flex overflow-hidden rounded-3xl border border-white/15 bg-zinc-950 shadow-[0_28px_80px_rgba(0,0,0,0.62)]" role="dialog" aria-modal="true" aria-label="CoreX AI">
            <div ref={expandedPanelRef} tabIndex={-1} className="flex min-h-0 flex-1 outline-none">
              {isHistoryOpen ? (
                <ChatHistoryPanel
                  conversations={conversations}
                  activeConversationId={conversationId}
                  mode={conversationMode}
                  isLoading={isHistoryLoading}
                  error={historyError}
                  canSave={canSaveChats}
                  onClose={() => setIsHistoryOpen(false)}
                  onSelect={(id) => void selectConversation(id)}
                  onNew={startConversation}
                  onRename={renameConversation}
                  onDelete={deleteConversation}
                />
              ) : <ChatPanel id="mobile-expanded-ai-chat" {...sharedPanelProps} inputRef={mobileInputRef} onReduce={reduceMobileChat} onMinimize={collapseMobileChat} />}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
