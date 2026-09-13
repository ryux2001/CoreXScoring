const MIN_SECRET_LENGTH = 32;

export function getRequiredServerSecret(name: string): string {
  const secret = process.env[name]?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`Falta configurar ${name} con al menos ${MIN_SECRET_LENGTH} caracteres aleatorios.`);
  }
  return secret;
}

export function getOptionalServerSecret(name: string): string | undefined {
  const secret = process.env[name]?.trim();
  if (!secret) return undefined;
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} debe tener al menos ${MIN_SECRET_LENGTH} caracteres aleatorios.`);
  }
  return secret;
}

export function validateProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") return;

  getRequiredServerSecret("AI_ACTION_SECRET");
  getRequiredServerSecret("AI_IP_HASH_SECRET");
  getRequiredServerSecret("AI_PROVIDER_KEYS_ENCRYPTION_SECRET");
}
