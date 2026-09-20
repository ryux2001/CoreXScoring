import { redirect } from '@/i18n/server-navigation';

export default async function ForgotPasswordPage() {
  await redirect('/auth');
}
