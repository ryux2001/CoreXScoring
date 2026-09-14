import LegalPage from "@/ui/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de uso | CoreXScoring",
  description: "Condiciones de uso de CoreXScoring.",
  alternates: { canonical: "https://corexscoring.com/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos de uso">
      <p>Estos términos regulan el acceso y uso de CoreXScoring. Al crear una cuenta o utilizar el servicio, aceptas estas condiciones y confirmas haber leído la <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">Política de privacidad</a>.</p>

      <h2 className="font-display text-2xl font-bold text-white">El servicio</h2>
      <p>CoreXScoring ofrece herramientas orientativas para consultar, comparar componentes de PC y crear configuraciones. Actualmente es un proyecto personal gratuito y no ofrece la venta directa de productos. Podemos modificar, suspender o retirar funciones cuando sea necesario para mantener o evolucionar el servicio.</p>

      <h2 className="font-display text-2xl font-bold text-white">Cuentas</h2>
      <p>Eres responsable de facilitar datos correctos al crear tu cuenta y de mantener protegidos tus medios de acceso. No debes compartir tu cuenta ni usar la de otra persona sin autorización. Puedes eliminar tu cuenta desde la configuración disponible en la aplicación.</p>

      <h2 className="font-display text-2xl font-bold text-white">Información y decisiones de compra</h2>
      <p>Las puntuaciones, comparativas, precios, compatibilidades, disponibilidad, estimaciones de rendimiento y recomendaciones tienen carácter informativo. Pueden contener errores, estar desactualizados o no reflejar todas las condiciones de un producto. Debes verificar la información directamente con el fabricante, vendedor o fuente correspondiente antes de tomar una decisión de compra o montaje.</p>

      <h2 className="font-display text-2xl font-bold text-white">CoreX AI y proveedores externos</h2>
      <p>Las respuestas generadas por CoreX AI pueden ser inexactas o incompletas y no sustituyen el criterio técnico profesional. Las acciones que modifican datos dentro de la aplicación requieren confirmación explícita. Si eliges usar Groq, Cerebras, OpenRouter u otro proveedor externo disponible, también se aplican sus términos y políticas. No introduzcas secretos, contraseñas, datos financieros ni información que no quieras compartir con el proveedor elegido.</p>

      <h2 className="font-display text-2xl font-bold text-white">Uso permitido</h2>
      <p>No está permitido usar el servicio para actividades ilícitas, vulnerar derechos de terceros, intentar acceder a datos o cuentas ajenas, eludir medidas de seguridad, automatizar abusivamente el acceso, interferir con el funcionamiento de la aplicación o consumir cuotas de forma fraudulenta. Podemos limitar o cancelar el acceso cuando detectemos un uso contrario a estas condiciones o un riesgo para el servicio.</p>

      <h2 className="font-display text-2xl font-bold text-white">Cambios y vigencia</h2>
      <p>Podemos actualizar estos términos cuando cambie el servicio, se incorporen nuevas funciones o sea necesario por motivos legales o de seguridad. La versión vigente será la publicada en esta página, con su fecha de actualización. Si el proyecto incorpora en el futuro funciones de pago, publicidad o servicios comerciales, las condiciones aplicables se actualizarán antes de su activación.</p>

      <h2 className="font-display text-2xl font-bold text-white">Ley aplicable y contacto</h2>
      <p>Estos términos se rigen por la legislación española, sin perjuicio de las normas imperativas de protección que puedan corresponderte. Para consultas sobre estas condiciones puedes escribir a <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>.</p>

      <p className="text-sm text-zinc-500">Última actualización: 14 de septiembre de 2026.</p>
    </LegalPage>
  );
}
