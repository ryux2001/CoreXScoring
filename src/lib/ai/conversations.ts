import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type {
  BuildDraft,
  ChatMessage,
  ComboDraft,
  ConversationMessage,
  ConversationRecord,
  ConversationSummary,
  PersistedConversationState,
} from "./types";
import type { ExternalPriceSearchResult } from "./web-search/types";

const MAX_TITLE_LENGTH = 80;
const MAX_METADATA_LENGTH = 48_000;

interface ConversationRow {
  id: string;
  title: string;
  state: unknown;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

interface MessageRow {
  id: number;
  role: "user" | "assistant";
  content: string;
  metadata: unknown;
  created_at: string;
}

function normalizeTitle(value: string): string {
  const title = value.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
  return title || "Nuevo chat";
}

function asState(value: unknown): PersistedConversationState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { version: 1 };
  const row = value as Record<string, unknown>;
  const state: PersistedConversationState = { version: 1 };
  if (row.buildDraft && typeof row.buildDraft === "object") state.buildDraft = row.buildDraft as BuildDraft;
  if (row.comboDraft && typeof row.comboDraft === "object") state.comboDraft = row.comboDraft as ComboDraft;
  return state;
}

function asMetadata(value: unknown): ConversationMessage["metadata"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  return row.webSearch && typeof row.webSearch === "object"
    ? { webSearch: row.webSearch as ExternalPriceSearchResult }
    : undefined;
}

function toSummary(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    messageCount: Number(row.message_count) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}

function toMessage(row: MessageRow): ConversationMessage {
  return {
    id: Number(row.id),
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    ...(asMetadata(row.metadata) ? { metadata: asMetadata(row.metadata) } : {}),
  };
}

function compactState(value: {
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
}): PersistedConversationState {
  return {
    version: 1,
    ...(value.buildDraft ? { buildDraft: value.buildDraft } : {}),
    ...(value.comboDraft ? { comboDraft: value.comboDraft } : {}),
  };
}

function compactMetadata(webSearch?: ExternalPriceSearchResult): Record<string, unknown> {
  if (!webSearch) return {};
  const metadata = JSON.stringify({ webSearch });
  return metadata.length <= MAX_METADATA_LENGTH ? { webSearch } : {};
}

export async function listAiConversations(userId: string): Promise<ConversationSummary[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("ai_conversations")
    .select("id,title,message_count,created_at,updated_at,last_message_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(10);
  if (error) throw new Error("No se pudo cargar el historial de CoreX AI.");
  return ((data || []) as ConversationRow[]).map(toSummary);
}

export async function getAiConversation(userId: string, conversationId: string): Promise<ConversationRecord | null> {
  const admin = createSupabaseAdminClient();
  const [{ data: conversation, error: conversationError }, { data: messages, error: messagesError }] = await Promise.all([
    admin.from("ai_conversations").select("id,title,state,message_count,created_at,updated_at,last_message_at").eq("id", conversationId).eq("user_id", userId).maybeSingle(),
    admin.from("ai_conversation_messages").select("id,role,content,metadata,created_at").eq("conversation_id", conversationId).order("id", { ascending: true }).limit(150),
  ]);

  if (conversationError || messagesError) throw new Error("No se pudo cargar la conversación de CoreX AI.");
  if (!conversation) return null;

  const row = conversation as ConversationRow;
  return {
    ...toSummary(row),
    state: asState(row.state),
    messages: ((messages || []) as MessageRow[]).map(toMessage),
  };
}

export async function renameAiConversation(userId: string, conversationId: string, title: string): Promise<void> {
  const { error, count } = await createSupabaseAdminClient()
    .from("ai_conversations")
    .update({ title: normalizeTitle(title), updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (error) throw new Error("No se pudo renombrar la conversación.");
  if (count !== 1) throw new Error("La conversación no existe o no pertenece a tu cuenta.");
}

export async function deleteAiConversation(userId: string, conversationId: string): Promise<void> {
  const { error, count } = await createSupabaseAdminClient()
    .from("ai_conversations")
    .delete({ count: "exact" })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (error) throw new Error("No se pudo eliminar la conversación.");
  if (count !== 1) throw new Error("La conversación no existe o no pertenece a tu cuenta.");
}

export async function appendAiConversationTurn({
  userId,
  conversationId,
  userMessage,
  assistantMessage,
  webSearch,
  buildDraft,
  comboDraft,
  title,
}: {
  userId: string;
  conversationId?: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  webSearch?: ExternalPriceSearchResult;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  title?: string;
}): Promise<string> {
  const { data, error } = await createSupabaseAdminClient().rpc("append_ai_conversation_turn", {
    p_user_id: userId,
    p_conversation_id: conversationId || null,
    p_user_content: userMessage.content,
    p_assistant_content: assistantMessage.content,
    p_metadata: compactMetadata(webSearch),
    p_state: compactState({ buildDraft, comboDraft }),
    p_title: title ? normalizeTitle(title) : null,
  });
  if (error) {
    if (error.message?.includes("ai_conversation_limit")) {
      throw new Error("Has alcanzado el límite de 10 chats guardados. Elimina uno para crear otro.");
    }
    throw new Error("No se pudo guardar el turno de la conversación.");
  }
  if (typeof data !== "string") throw new Error("Supabase no devolvió el identificador de la conversación.");
  return data;
}

export function getConversationPromptMessages(conversation: ConversationRecord): ChatMessage[] {
  return conversation.messages.slice(-12).map(({ role, content }) => ({ role, content }));
}
