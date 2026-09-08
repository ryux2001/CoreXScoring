import { notFound, redirect } from 'next/navigation';
import { getAdminUser, parseCatalogKind } from '@/lib/admin/catalog';
import AdminCatalogEditor from '../../components/AdminCatalogEditor';

export default async function NewAdminCatalogPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const user = await getAdminUser();
  if (!user) redirect('/auth');

  const kind = parseCatalogKind((await params).kind);
  if (!kind) notFound();

  return <AdminCatalogEditor kind={kind} />;
}
