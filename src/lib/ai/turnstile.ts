import { getRequiredServerSecret } from "@/lib/server-secrets";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2_048;

export class TurnstileUnavailableError extends Error {}

export function isAnonymousTurnstileEnabled(): boolean {
  return process.env.AI_ANONYMOUS_TURNSTILE_REQUIRED?.trim().toLowerCase() === "true";
}

export function getAnonymousTurnstileMessageThreshold(): number {
  const value = Number(process.env.AI_ANONYMOUS_TURNSTILE_AFTER_MESSAGES ?? 3);
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : 3;
}

export function shouldRequireAnonymousTurnstile(messagesUsed: number): boolean {
  return isAnonymousTurnstileEnabled() && messagesUsed >= getAnonymousTurnstileMessageThreshold();
}

export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return false;

  const secret = getRequiredServerSecret("TURNSTILE_SECRET_KEY");
  let response: Response;
  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch {
    throw new TurnstileUnavailableError("Turnstile verification failed");
  }
  if (!response.ok) throw new TurnstileUnavailableError("Turnstile verification failed");

  const payload = await response.json().catch(() => null) as { success?: unknown; hostname?: unknown } | null;
  const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim().toLowerCase();
  if (expectedHostname && payload?.hostname !== expectedHostname) return false;
  return payload?.success === true;
}
