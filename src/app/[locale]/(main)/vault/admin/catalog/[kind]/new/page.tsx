import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/server-navigation';
import { getAdminUser, parseCatalogKind } from '@/lib/admin/catalog';
import AdminCatalogEditor from '../../components/AdminCatalogEditor';

export default async function NewAdminCatalogPage({
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

  return <AdminCatalogEditor kind={kind} />;
}
