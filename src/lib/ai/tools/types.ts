import type { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { BuildDraft, ComboDraft, PageContext, PendingAction } from "../types";

export type AiSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface AiActor {
  id: string;
  isAnonymous: boolean;
}

export interface AiToolContext {
  supabase: AiSupabaseClient;
  actor: AiActor;
  pageContext?: PageContext;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
}

export interface AiToolSuccess {
  ok: true;
  data: unknown;
  pendingAction?: PendingAction;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
}

export interface AiToolFailure {
  ok: false;
  error: string;
}

export type AiToolResult = AiToolSuccess | AiToolFailure;
