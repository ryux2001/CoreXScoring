import { redirect } from '@/i18n/server-navigation';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { loadHomeAdminData } from '@/lib/admin/home';
import AdminHomeManager from './components/AdminHomeManager';

export default async function AdminHomePage() {
  const user = await getAdminUser();
  if (!user) {
    await redirect('/auth');
    return null;
  }

  const data = await loadHomeAdminData(getAdminDb());
  return <AdminHomeManager initialData={data} />;
}
