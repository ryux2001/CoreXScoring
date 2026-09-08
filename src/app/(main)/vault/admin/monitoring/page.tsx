import { notFound, redirect } from 'next/navigation';
import { Activity } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import AdminPanelPlaceholder from '../components/AdminPanelPlaceholder';

export default async function AdminMonitoringPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');
  if (user.is_anonymous || user.app_metadata?.role !== 'admin') notFound();

  return (
    <AdminPanelPlaceholder
      eyebrow="Administración / Seguimiento"
      title="Seguimiento de plataforma"
      description="Un espacio para consultar el uso de la plataforma, detectar errores y entender la actividad de los usuarios."
      icon={Activity}
      features={['Uso de usuarios', 'Errores y alertas', 'Actividad de la plataforma', 'Métricas de rendimiento']}
    />
  );
}
