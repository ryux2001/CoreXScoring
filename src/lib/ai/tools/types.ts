import type { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { PageContext } from "../types";

export type AiSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface AiActor {
  id: string;
  isAnonymous: boolean;
}

export interface AiToolContext {
  supabase: AiSupabaseClient;
  actor: AiActor;
  pageContext?: PageContext;
}

export interface AiToolSuccess {
  ok: true;
  data: unknown;
}

export interface AiToolFailure {
  ok: false;
  error: string;
}

export type AiToolResult = AiToolSuccess | AiToolFailure;
