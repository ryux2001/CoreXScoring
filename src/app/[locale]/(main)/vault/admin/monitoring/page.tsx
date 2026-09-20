import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/server-navigation';
import { Activity } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import AdminPanelPlaceholder from '../components/AdminPanelPlaceholder';
import { getTranslations } from 'next-intl/server';

export default async function AdminMonitoringPage() {
  const t = await getTranslations('admin.monitoring');
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await redirect('/auth');
    return null;
  }
  if (user.is_anonymous || user.app_metadata?.role !== 'admin') notFound();

  return (
    <AdminPanelPlaceholder
      eyebrow={t('eyebrow')}
      title={t('title')}
      description={t('description')}
      icon={Activity}
      features={[t('features.users'), t('features.errors'), t('features.activity'), t('features.performance')]}
    />
  );
}
