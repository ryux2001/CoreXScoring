import { notFound, redirect } from 'next/navigation';
import { getAdminDb, getAdminUser, loadCatalogRows, parseCatalogKind } from '@/lib/admin/catalog';
import AdminCatalogList from '../components/AdminCatalogList';

export default async function AdminCatalogListPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const user = await getAdminUser();
  if (!user) redirect('/auth');

  const kind = parseCatalogKind((await params).kind);
  if (!kind) notFound();

  const rows = await loadCatalogRows(getAdminDb(), kind);
  return <AdminCatalogList kind={kind} rows={rows} />;
}
