"use client";

import { useState } from "react";
import { ArrowLeft, Clock3, History, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { AiConversationMode, ConversationSummary } from "@/lib/ai/types";

interface ChatHistoryPanelProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  mode: AiConversationMode;
  isLoading: boolean;
  error: string | null;
  canSave: boolean;
  onClose: () => void;
  onSelect: (conversationId: string) => void;
  onNew: (mode: AiConversationMode) => void;
  onRename: (conversationId: string, title: string) => Promise<void>;
  onDelete: (conversation: ConversationSummary) => Promise<void>;
}

function formatDate(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function ChatHistoryPanel({
  conversations,
  activeConversationId,
  mode,
  isLoading,
  error,
  canSave,
  onClose,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ChatHistoryPanelProps) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isMutating, setIsMutating] = useState(false);

  const startRename = (conversation: ConversationSummary) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const submitRename = async () => {
    if (!editingId || !editingTitle.trim() || isMutating) return;
    setIsMutating(true);
    try {
      await onRename(editingId, editingTitle);
      setEditingId(null);
    } finally {
      setIsMutating(false);
    }
  };

  const deleteConversation = async (conversation: ConversationSummary) => {
    if (isMutating || !window.confirm(t("history.deleteConfirmation", { title: conversation.title }))) return;
    setIsMutating(true);
    try {
      await onDelete(conversation);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-black" aria-label={t("history.regionLabel")}>
      <header className="flex items-center gap-3 border-b border-white/10 bg-zinc-950/95 px-4 py-3.5">
        <button type="button" onClick={onClose} aria-label={t("history.backToChat")} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
          <ArrowLeft aria-hidden="true" size={17} />
        </button>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-white"><History aria-hidden="true" size={16} className="text-cyan-200" /> {t("history.title")}</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">{t("history.count", { count: conversations.length, limit: 10 })}</p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-white/10 bg-zinc-950/60 p-3">
        <button type="button" onClick={() => onNew("saved")} disabled={!canSave || conversations.length >= 10 || isMutating} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 text-xs font-bold text-cyan-950 transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"><Plus aria-hidden="true" size={15} /> {t("history.newChat")}</button>
        <button type="button" onClick={() => onNew("temporary")} disabled={isMutating} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 transition-colors hover:border-cyan-300/40 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-45"><Clock3 aria-hidden="true" size={15} /> {t("history.temporary")}</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!canSave && <p className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-relaxed text-amber-100">{t("history.signInRequired")}</p>}
        {error && <p role="alert" className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100">{error}</p>}
        {isLoading ? (
          <div className="space-y-2" aria-label={t("history.loading")}>
            <div className="h-16 animate-pulse rounded-xl bg-zinc-900" />
            <div className="h-16 animate-pulse rounded-xl bg-zinc-900" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center">
            <History aria-hidden="true" size={20} className="mx-auto text-zinc-600" />
            <p className="mt-3 text-sm font-semibold text-zinc-300">{t("history.emptyTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t("history.emptyDescription")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                {editingId === conversation.id ? (
                  <form className="rounded-xl border border-cyan-300/30 bg-cyan-300/[0.05] p-3" onSubmit={(event) => { event.preventDefault(); void submitRename(); }}>
                    <label className="sr-only" htmlFor={`rename-${conversation.id}`}>{t("history.renameInputLabel")}</label>
                    <input id={`rename-${conversation.id}`} autoFocus value={editingTitle} maxLength={80} onChange={(event) => setEditingTitle(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-200/40" />
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{t("history.cancel")}</button>
                      <button type="submit" disabled={!editingTitle.trim() || isMutating} className="rounded-lg bg-cyan-400 px-2.5 py-1.5 text-xs font-bold text-cyan-950 disabled:opacity-45">{t("history.save")}</button>
                    </div>
                  </form>
                ) : (
                  <div className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${activeConversationId === conversation.id && mode === "saved" ? "border-cyan-300/35 bg-cyan-300/[0.08]" : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"}`}>
                    <button type="button" onClick={() => onSelect(conversation.id)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
                      <span className="block truncate text-sm font-semibold text-zinc-100">{conversation.title}</span>
                      <span className="mt-1 block text-[11px] text-zinc-500">{t("history.messageCount", { count: conversation.messageCount })} · {formatDate(conversation.lastMessageAt, locale)}</span>
                    </button>
                    <button type="button" onClick={() => startRename(conversation)} aria-label={t("history.rename", { title: conversation.title })} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 opacity-70 transition-colors hover:bg-white/10 hover:text-cyan-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Pencil aria-hidden="true" size={14} /></button>
                    <button type="button" onClick={() => void deleteConversation(conversation)} aria-label={t("history.delete", { title: conversation.title })} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 opacity-70 transition-colors hover:bg-zinc-800 hover:text-red-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Trash2 aria-hidden="true" size={14} /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
