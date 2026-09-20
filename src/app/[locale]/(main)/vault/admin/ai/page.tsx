import { notFound } from "next/navigation";
import { redirect } from "@/i18n/server-navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AdminAiDashboard from "./AdminAiDashboard";

export default async function AiAdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await redirect("/auth");
    return null;
  }
  if (user.is_anonymous || user.app_metadata?.role !== "admin") notFound();

  return <AdminAiDashboard />;
}
