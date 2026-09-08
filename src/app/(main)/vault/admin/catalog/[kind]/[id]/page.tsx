import { notFound, redirect } from 'next/navigation';
import { getAdminDb, getAdminUser, loadCatalogRow, parseCatalogKind } from '@/lib/admin/catalog';
import AdminCatalogEditor from '../../components/AdminCatalogEditor';

export default async function EditAdminCatalogPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const user = await getAdminUser();
  if (!user) redirect('/auth');

  const { kind: rawKind, id } = await params;
  const kind = parseCatalogKind(rawKind);
  if (!kind) notFound();

  const row = await loadCatalogRow(getAdminDb(), kind, id);
  if (!row) notFound();

  return <AdminCatalogEditor kind={kind} initialRow={row} />;
}
