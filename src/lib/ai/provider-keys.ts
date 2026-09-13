import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getOptionalServerSecret, getRequiredServerSecret } from "@/lib/server-secrets";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_VERSION_PATTERN = /^v[1-9]\d*$/;

function toEncryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function getCurrentKeyVersion(): string {
  const version = process.env.AI_PROVIDER_KEYS_ENCRYPTION_KEY_VERSION?.trim() || "v1";
  if (!KEY_VERSION_PATTERN.test(version)) {
    throw new Error("AI_PROVIDER_KEYS_ENCRYPTION_KEY_VERSION debe tener el formato vN.");
  }
  return version;
}

function getEncryptionKey(version: string): Buffer | undefined {
  const currentVersion = getCurrentKeyVersion();
  if (version === currentVersion) {
    return toEncryptionKey(getRequiredServerSecret("AI_PROVIDER_KEYS_ENCRYPTION_SECRET"));
  }

  const previousVersion = process.env.AI_PROVIDER_KEYS_ENCRYPTION_PREVIOUS_KEY_VERSION?.trim();
  if (previousVersion === version) {
    const previousSecret = getOptionalServerSecret("AI_PROVIDER_KEYS_ENCRYPTION_PREVIOUS_SECRET");
    return previousSecret ? toEncryptionKey(previousSecret) : undefined;
  }

  return undefined;
}

/** Cifra una API key para que Supabase nunca almacene el secreto en claro. */
export function encryptProviderApiKey(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const version = getCurrentKeyVersion();
  const key = getEncryptionKey(version);
  if (!key) throw new Error("No se pudo cargar la clave de cifrado BYOK actual.");
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [version, iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptProviderApiKey(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const parts = value.split(".");
    const [version, ivEncoded, tagEncoded, ciphertextEncoded] = parts.length === 4
      ? parts
      : ["v1", parts[0], parts[1], parts[2]];
    if (!ivEncoded || !tagEncoded || !ciphertextEncoded) return undefined;
    const key = getEncryptionKey(version);
    if (!key) return undefined;
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return undefined;
  }
}
