import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createNoIndexMetadata();

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
