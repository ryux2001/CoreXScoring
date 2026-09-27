import { redirect } from '@/i18n/server-navigation';
import { getAdminDb, getAdminUser, loadProductPriceRows, loadProductTypes, type AdminProductPriceStatus } from '@/lib/admin/catalog';
import AdminProductPrices from '../components/AdminProductPrices';

type SearchParams = {
  q?: string;
  type?: string;
  status?: string;
  page?: string;
};

export default async function AdminProductPricesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getAdminUser();
  if (!user) {
    await redirect('/auth');
    return null;
  }

  const params = await searchParams;
  const status: AdminProductPriceStatus = params.status === 'current' || params.status === 'missing' ? params.status : 'all';
  const page = Number.parseInt(params.page ?? '1', 10);
  const db = getAdminDb();
  const [{ rows, count, page: safePage, pageSize }, types] = await Promise.all([
    loadProductPriceRows(db, { query: params.q, type: params.type, status, page }),
    loadProductTypes(db),
  ]);

  return (
    <AdminProductPrices
      initialRows={rows}
      count={count}
      page={safePage}
      pageSize={pageSize}
      types={types}
      filters={{ q: params.q ?? '', type: params.type ?? 'all', status }}
    />
  );
}
