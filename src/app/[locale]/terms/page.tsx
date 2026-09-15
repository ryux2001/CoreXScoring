import { Link } from "@/i18n/navigation";
import LegalPage from "@/ui/legal/LegalPage";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const english = locale === "en";
  const prefix = english ? "" : "/es";

  return {
    title: english ? "Terms of Use | CoreXScoring" : "Términos de uso | CoreXScoring",
    description: english ? "Terms and conditions for using CoreXScoring." : "Condiciones de uso de CoreXScoring.",
    alternates: {
      canonical: `https://corexscoring.com${prefix}/terms`,
      languages: {
        en: "https://corexscoring.com/terms",
        es: "https://corexscoring.com/es/terms",
      },
    },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const english = locale === "en";

  return (
    <LegalPage title={english ? "Terms of Use" : "Términos de uso"}>
      <p>{english ? <>These terms govern access to and use of CoreXScoring. By creating an account or using the service, you accept these terms and confirm that you have read the <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">Privacy Policy</Link>.</> : <>Estos términos regulan el acceso y uso de CoreXScoring. Al crear una cuenta o utilizar el servicio, aceptas estas condiciones y confirmas haber leído la <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">Política de privacidad</Link>.</>}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "The service" : "El servicio"}</h2>
      <p>{english ? "CoreXScoring provides guidance tools for browsing and comparing PC components and creating configurations. It is currently a free personal project and does not sell products directly. We may modify, suspend or remove features when necessary to maintain or evolve the service." : "CoreXScoring ofrece herramientas orientativas para consultar, comparar componentes de PC y crear configuraciones. Actualmente es un proyecto personal gratuito y no ofrece la venta directa de productos. Podemos modificar, suspender o retirar funciones cuando sea necesario para mantener o evolucionar el servicio."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Accounts" : "Cuentas"}</h2>
      <p>{english ? "You are responsible for providing accurate information when creating your account and for protecting your access methods. You must not share your account or use another person's account without authorization. You can delete your account from the settings available in the application." : "Eres responsable de facilitar datos correctos al crear tu cuenta y de mantener protegidos tus medios de acceso. No debes compartir tu cuenta ni usar la de otra persona sin autorización. Puedes eliminar tu cuenta desde la configuración disponible en la aplicación."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Information and purchasing decisions" : "Información y decisiones de compra"}</h2>
      <p>{english ? "Scores, comparisons, prices, compatibility, availability, performance estimates and recommendations are provided for information only. They may contain errors, be out of date or fail to reflect all product conditions. You should verify information directly with the manufacturer, seller or relevant source before making a purchase or assembly decision." : "Las puntuaciones, comparativas, precios, compatibilidades, disponibilidad, estimaciones de rendimiento y recomendaciones tienen carácter informativo. Pueden contener errores, estar desactualizados o no reflejar todas las condiciones de un producto. Debes verificar la información directamente con el fabricante, vendedor o fuente correspondiente antes de tomar una decisión de compra o montaje."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "CoreX AI and external providers" : "CoreX AI y proveedores externos"}</h2>
      <p>{english ? "CoreX AI responses may be inaccurate or incomplete and do not replace professional technical judgment. Actions that modify data in the application require explicit confirmation. If you choose to use Groq, Cerebras, OpenRouter or another available external provider, their terms and policies also apply. Do not enter secrets, passwords, financial data or information you do not want to share with the selected provider." : "Las respuestas generadas por CoreX AI pueden ser inexactas o incompletas y no sustituyen el criterio técnico profesional. Las acciones que modifican datos dentro de la aplicación requieren confirmación explícita. Si eliges usar Groq, Cerebras, OpenRouter u otro proveedor externo disponible, también se aplican sus términos y políticas. No introduzcas secretos, contraseñas, datos financieros ni información que no quieras compartir con el proveedor elegido."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Acceptable use" : "Uso permitido"}</h2>
      <p>{english ? "You may not use the service for unlawful activities, to violate third-party rights, attempt to access other people's data or accounts, bypass security measures, abusively automate access, interfere with the application or fraudulently consume quotas. We may limit or cancel access when we detect conduct that violates these terms or creates a risk to the service." : "No está permitido usar el servicio para actividades ilícitas, vulnerar derechos de terceros, intentar acceder a datos o cuentas ajenas, eludir medidas de seguridad, automatizar abusivamente el acceso, interferir con el funcionamiento de la aplicación o consumir cuotas de forma fraudulenta. Podemos limitar o cancelar el acceso cuando detectemos un uso contrario a estas condiciones o un riesgo para el servicio."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Changes and validity" : "Cambios y vigencia"}</h2>
      <p>{english ? "We may update these terms when the service changes, new features are added or legal or security reasons require it. The current version is the one published on this page, with its update date. If the project adds paid features, advertising or commercial services in the future, the applicable terms will be updated before activation." : "Podemos actualizar estos términos cuando cambie el servicio, se incorporen nuevas funciones o sea necesario por motivos legales o de seguridad. La versión vigente será la publicada en esta página, con su fecha de actualización. Si el proyecto incorpora en el futuro funciones de pago, publicidad o servicios comerciales, las condiciones aplicables se actualizarán antes de su activación."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Applicable law and contact" : "Ley aplicable y contacto"}</h2>
      <p>{english ? <>These terms are governed by Spanish law, without prejudice to any mandatory consumer protection rules that may apply. For questions about these terms, contact <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>.</> : <>Estos términos se rigen por la legislación española, sin perjuicio de las normas imperativas de protección que puedan corresponderte. Para consultas sobre estas condiciones puedes escribir a <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>.</>}</p>

      <p className="text-sm text-zinc-500">{english ? "Last updated: September 14, 2026." : "Última actualización: 14 de septiembre de 2026."}</p>
    </LegalPage>
  );
}
