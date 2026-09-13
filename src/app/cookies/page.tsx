import LegalPage from "@/ui/legal/LegalPage";

export const metadata = { title: "Política de cookies | CoreXScoring" };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <p>CoreXScoring usa cookies esenciales para mantener la sesión de Supabase y proteger las solicitudes autenticadas.</p>
      <h2 className="font-display text-2xl font-bold text-white">Preferencias locales</h2>
      <p>Algunas preferencias de interfaz, como el estado del comparador, pueden guardarse en el almacenamiento local del navegador. No contienen API keys ni conversaciones completas.</p>
      <h2 className="font-display text-2xl font-bold text-white">Sin publicidad</h2>
      <p>No usamos cookies publicitarias ni vendemos información de navegación. Si se incorporan servicios de medición futuros, esta política se actualizará antes de activarlos.</p>
      <p className="text-sm text-zinc-500">Última actualización: 13 de septiembre de 2026.</p>
    </LegalPage>
  );
}
