import { redirect } from 'next/navigation';
import { getAdminDb, getAdminUser } from '@/lib/admin/catalog';
import { loadHomeAdminData } from '@/lib/admin/home';
import AdminHomeManager from './components/AdminHomeManager';

export default async function AdminHomePage() {
  const user = await getAdminUser();
  if (!user) redirect('/auth');

  const data = await loadHomeAdminData(getAdminDb());
  return <AdminHomeManager initialData={data} />;
}
