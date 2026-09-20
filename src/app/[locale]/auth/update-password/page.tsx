import { redirect } from '@/i18n/server-navigation';

export default async function UpdatePasswordPage() {
  await redirect('/auth');
}
