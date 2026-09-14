import LegalPage from "@/ui/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies | CoreXScoring",
  description: "Información sobre las cookies y el almacenamiento local de CoreXScoring.",
  alternates: { canonical: "https://corexscoring.com/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <p>Esta política explica cómo CoreXScoring usa cookies y tecnologías de almacenamiento local. Actualmente solo utilizamos tecnologías estrictamente necesarias para que el servicio funcione de forma segura.</p>

      <h2 className="font-display text-2xl font-bold text-white">Qué son las cookies</h2>
      <p>Las cookies son pequeños archivos que el navegador guarda en tu dispositivo. Permiten recordar una sesión, aplicar medidas de seguridad y mantener funciones básicas entre páginas. No se usan para acceder a información fuera de CoreXScoring.</p>

      <h2 className="font-display text-2xl font-bold text-white">Cookies esenciales</h2>
      <p>Usamos cookies de sesión y seguridad gestionadas por Supabase para iniciar y mantener tu sesión, reconocer solicitudes autenticadas y proteger el acceso a tu cuenta. Estas cookies son necesarias para las funciones de autenticación, incluida la opción de acceder con Google, y no pueden desactivarse desde CoreXScoring sin afectar al funcionamiento del servicio.</p>

      <h2 className="font-display text-2xl font-bold text-white">Almacenamiento local</h2>
      <p>Algunas preferencias de interfaz, como el estado del comparador, pueden guardarse en el almacenamiento local del navegador. Estos datos permanecen en tu dispositivo hasta que los elimines desde la configuración de tu navegador. No se guardan API keys ni conversaciones completas en el almacenamiento local.</p>

      <h2 className="font-display text-2xl font-bold text-white">Sin analítica ni publicidad</h2>
      <p>Actualmente no utilizamos cookies analíticas, publicitarias, de seguimiento ni herramientas de medición de audiencia. Tampoco vendemos información de navegación ni mostramos publicidad personalizada. Por ello, no se muestra un banner de consentimiento para cookies no esenciales.</p>

      <h2 className="font-display text-2xl font-bold text-white">Cómo gestionar las cookies</h2>
      <p>Puedes bloquear o eliminar cookies desde la configuración de tu navegador. Ten en cuenta que, si eliminas o bloqueas las cookies esenciales, es posible que no puedas iniciar sesión o usar las funciones que requieren una cuenta.</p>

      <h2 className="font-display text-2xl font-bold text-white">Cambios y contacto</h2>
      <p>Actualizaremos esta política antes de incorporar analítica, publicidad u otras tecnologías no esenciales. Para cualquier consulta sobre cookies o privacidad, escribe a <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>. Puedes consultar información adicional en la <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">Política de privacidad</a>.</p>

      <p className="text-sm text-zinc-500">Última actualización: 14 de septiembre de 2026.</p>
    </LegalPage>
  );
}
