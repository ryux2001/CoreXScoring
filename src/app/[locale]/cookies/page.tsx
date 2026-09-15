import { Link } from "@/i18n/navigation";
import LegalPage from "@/ui/legal/LegalPage";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const english = locale === "en";
  const prefix = english ? "" : "/es";

  return {
    title: english ? "Cookie Policy | CoreXScoring" : "Política de cookies | CoreXScoring",
    description: english ? "Information about cookies and local storage used by CoreXScoring." : "Información sobre las cookies y el almacenamiento local de CoreXScoring.",
    alternates: {
      canonical: `https://corexscoring.com${prefix}/cookies`,
      languages: {
        en: "https://corexscoring.com/cookies",
        es: "https://corexscoring.com/es/cookies",
      },
    },
  };
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const english = locale === "en";

  return (
    <LegalPage title={english ? "Cookie Policy" : "Política de cookies"}>
      <p>{english ? "This policy explains how CoreXScoring uses cookies and local storage technologies. We use technologies that are strictly necessary for the service to operate securely and aggregated analytics without advertising cookies." : "Esta política explica cómo CoreXScoring usa cookies y tecnologías de almacenamiento local. Usamos tecnologías estrictamente necesarias para que el servicio funcione de forma segura y analítica agregada sin cookies publicitarias."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "What cookies are" : "Qué son las cookies"}</h2>
      <p>{english ? "Cookies are small files that the browser stores on your device. They allow us to remember a session, apply security measures and maintain basic functions between pages. They are not used to access information outside CoreXScoring." : "Las cookies son pequeños archivos que el navegador guarda en tu dispositivo. Permiten recordar una sesión, aplicar medidas de seguridad y mantener funciones básicas entre páginas. No se usan para acceder a información fuera de CoreXScoring."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Essential cookies" : "Cookies esenciales"}</h2>
      <p>{english ? "We use session and security cookies managed by Supabase to start and maintain your session, recognize authenticated requests and protect access to your account. These cookies are necessary for authentication features, including signing in with Google, and cannot be disabled in CoreXScoring without affecting the service." : "Usamos cookies de sesión y seguridad gestionadas por Supabase para iniciar y mantener tu sesión, reconocer solicitudes autenticadas y proteger el acceso a tu cuenta. Estas cookies son necesarias para las funciones de autenticación, incluida la opción de acceder con Google, y no pueden desactivarse desde CoreXScoring sin afectar al funcionamiento del servicio."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Local storage" : "Almacenamiento local"}</h2>
      <p>{english ? "Some interface preferences, such as comparison state, may be stored in the browser's local storage. This data remains on your device until you remove it from your browser settings. API keys and complete conversations are not stored in local storage." : "Algunas preferencias de interfaz, como el estado del comparador, pueden guardarse en el almacenamiento local del navegador. Estos datos permanecen en tu dispositivo hasta que los elimines desde la configuración de tu navegador. No se guardan API keys ni conversaciones completas en el almacenamiento local."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Aggregated analytics without advertising" : "Analítica agregada sin publicidad"}</h2>
      <p>{english ? "We use Vercel Web Analytics to measure aggregated visits, page views, general origin, approximate country and site performance. It does not use advertising cookies, sell browsing information, create individual profiles or show personalized advertising. Therefore, no consent banner is shown for non-essential cookies." : "Usamos Vercel Web Analytics para medir de forma agregada las visitas, páginas vistas, procedencia general, país aproximado y rendimiento del sitio. No usa cookies publicitarias, no vende información de navegación, no crea perfiles individuales y no muestra publicidad personalizada. Por ello, no se muestra un banner de consentimiento para cookies no esenciales."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Managing cookies" : "Cómo gestionar las cookies"}</h2>
      <p>{english ? "You can block or remove cookies from your browser settings. Keep in mind that removing or blocking essential cookies may prevent you from signing in or using features that require an account." : "Puedes bloquear o eliminar cookies desde la configuración de tu navegador. Ten en cuenta que, si eliminas o bloqueas las cookies esenciales, es posible que no puedas iniciar sesión o usar las funciones que requieren una cuenta."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Changes and contact" : "Cambios y contacto"}</h2>
      <p>{english ? <>We will update this policy before adding analytics, advertising or other non-essential technologies. For questions about cookies or privacy, write to <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>. More information is available in the <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">Privacy Policy</Link>.</> : <>Actualizaremos esta política antes de incorporar analítica, publicidad u otras tecnologías no esenciales. Para cualquier consulta sobre cookies o privacidad, escribe a <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>. Puedes consultar información adicional en la <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">Política de privacidad</Link>.</>}</p>

      <p className="text-sm text-zinc-500">{english ? "Last updated: September 15, 2026." : "Última actualización: 15 de septiembre de 2026."}</p>
    </LegalPage>
  );
}
