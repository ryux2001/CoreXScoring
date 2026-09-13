import { validateProductionSecrets } from "@/lib/server-secrets";

export async function register(): Promise<void> {
  validateProductionSecrets();
}
