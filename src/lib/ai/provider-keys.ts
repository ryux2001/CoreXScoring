import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_PROVIDER_KEYS_ENCRYPTION_SECRET?.trim()
    || process.env.AI_ACTION_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Falta configurar AI_PROVIDER_KEYS_ENCRYPTION_SECRET.");
  return createHash("sha256").update(secret).digest();
}

/** Cifra una API key para que Supabase nunca almacene el secreto en claro. */
export function encryptProviderApiKey(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptProviderApiKey(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
    if (!ivEncoded || !tagEncoded || !ciphertextEncoded) return undefined;
    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return undefined;
  }
}
