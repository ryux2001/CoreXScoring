import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/server-navigation';
import { getAdminDb, getAdminUser, loadCatalogRows, parseCatalogKind } from '@/lib/admin/catalog';
import AdminCatalogList from '../components/AdminCatalogList';

export default async function AdminCatalogListPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const user = await getAdminUser();
  if (!user) {
    await redirect('/auth');
    return null;
  }

  const kind = parseCatalogKind((await params).kind);
  if (!kind) notFound();

  const rows = await loadCatalogRows(getAdminDb(), kind);
  return <AdminCatalogList kind={kind} rows={rows} />;
}
