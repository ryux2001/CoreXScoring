export interface AiAdminConfig {
  anonymous_daily_messages: number;
  anonymous_daily_tokens: number;
  anonymous_ip_daily_messages: number;
  anonymous_ip_daily_tokens: number;
  authenticated_daily_messages: number;
  authenticated_daily_tokens: number;
  authenticated_ip_daily_messages: number;
  authenticated_ip_daily_tokens: number;
  updated_at: string;
}

export interface AiAdminLimits {
  request_rate_limit_per_minute: number;
  request_rate_window_seconds: number;
  global_concurrency_limit: number;
  user_concurrency_limit: number;
  anonymous_ip_concurrency_limit: number;
  active_pending_actions_limit: number;
  circuit_failure_threshold: number;
  circuit_timeout_threshold: number;
  circuit_window_seconds: number;
  circuit_cooldown_seconds: number;
}

export interface AiAdminBudget {
  daily_limit_microusd: number;
  monthly_limit_microusd: number;
  daily_used_microusd: number;
  monthly_used_microusd: number;
}

export interface AiAdminDailyUsage {
  usage_date: string;
  user_messages: number;
  user_reserved_tokens: number;
  ip_buckets: number;
}

export interface AiAdminProviderUsage {
  provider: "local" | "groq" | "cerebras" | "openrouter" | "guardrail";
  status: "success" | "error" | "guardrail" | "rate_limited";
  requests: number;
  tokens: number;
  average_duration_ms: number;
}

export interface AiAdminError {
  error_code: string;
  failures: number;
}

export interface AiAdminDailyIssues {
  issue_date: string;
  errors: number;
  rate_limited: number;
  total: number;
}

export interface AiAdminRecentError {
  created_at: string;
  error_code: string;
  provider: string;
  model: string;
  failure_stage: string | null;
  provider_http_status: number | null;
  finish_reason: string | null;
}

export interface AiAdminIpBucket {
  ip_hash: string;
  requests: number;
}

export interface AiAdminUsageResponse {
  days: number;
  config: AiAdminConfig;
  limits: AiAdminLimits;
  budget: AiAdminBudget;
  daily_usage: AiAdminDailyUsage[];
  daily_issues: AiAdminDailyIssues[];
  providers: AiAdminProviderUsage[];
  errors: AiAdminError[];
  recent_errors: AiAdminRecentError[];
  top_ip_buckets: AiAdminIpBucket[];
}
