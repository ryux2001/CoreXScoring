import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AdminAiDashboard from "./AdminAiDashboard";

export default async function AiAdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");
  if (user.is_anonymous || user.app_metadata?.role !== "admin") notFound();

  return <AdminAiDashboard />;
}
