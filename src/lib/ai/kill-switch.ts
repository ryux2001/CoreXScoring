export type AiKillSwitchProvider = "local" | "groq" | "cerebras" | "openrouter";

const PROVIDERS: readonly AiKillSwitchProvider[] = ["local", "groq", "cerebras", "openrouter"];

function isTruthy(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function isAiDisabled(): boolean {
  return isTruthy(process.env.AI_DISABLED);
}

export function isAiProviderDisabled(provider: AiKillSwitchProvider): boolean {
  const disabled = new Set(
    process.env.AI_DISABLED_PROVIDERS?.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
  return disabled.has(provider);
}

export function getDisabledAiProviders(): AiKillSwitchProvider[] {
  const disabled = new Set(
    process.env.AI_DISABLED_PROVIDERS?.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
  return PROVIDERS.filter((provider) => disabled.has(provider));
}
