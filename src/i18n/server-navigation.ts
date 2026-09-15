import { getLocale } from "next-intl/server";
import { redirect as navigate } from "./navigation";

export async function redirect(href: string): Promise<never> {
  const locale = await getLocale();
  return navigate({ href, locale });
}
