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

export interface AiAdminDailyUsage {
  usage_date: string;
  user_messages: number;
  user_reserved_tokens: number;
  ip_buckets: number;
}

export interface AiAdminProviderUsage {
  provider: "groq" | "openrouter" | "guardrail";
  status: "success" | "error" | "guardrail" | "rate_limited";
  requests: number;
  tokens: number;
  average_duration_ms: number;
}

export interface AiAdminError {
  error_code: string;
  failures: number;
}

export interface AiAdminIpBucket {
  ip_hash: string;
  requests: number;
}

export interface AiAdminUsageResponse {
  days: number;
  config: AiAdminConfig;
  daily_usage: AiAdminDailyUsage[];
  providers: AiAdminProviderUsage[];
  errors: AiAdminError[];
  top_ip_buckets: AiAdminIpBucket[];
}
