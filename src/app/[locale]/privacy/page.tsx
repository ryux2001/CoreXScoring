import { Link } from "@/i18n/navigation";
import LegalPage from "@/ui/legal/LegalPage";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const english = locale === "en";
  const prefix = english ? "" : "/es";

  return {
    title: english ? "Privacy Policy | CoreXScoring" : "Política de privacidad | CoreXScoring",
    description: english ? "Information about how CoreXScoring processes personal data." : "Información sobre el tratamiento de datos personales en CoreXScoring.",
    alternates: {
      canonical: `https://corexscoring.com${prefix}/privacy`,
      languages: {
        en: "https://corexscoring.com/privacy",
        es: "https://corexscoring.com/es/privacy",
      },
    },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const english = locale === "en";

  return (
    <LegalPage title={english ? "Privacy Policy" : "Política de privacidad"}>
      <p>{english ? "This policy explains how CoreXScoring processes personal data when you use the catalog, comparison tools, vault and CoreX AI. CoreXScoring is currently a free personal project in an early stage." : "Esta política explica cómo CoreXScoring trata los datos personales al usar el catálogo, las herramientas de comparación, la bóveda y CoreX AI. CoreXScoring es actualmente un proyecto personal y gratuito en fase inicial."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Data we process" : "Datos que tratamos"}</h2>
      <p>{english ? "When you create an account with Google, we receive only the basic profile information authorized by Google: your name, email address and account identifier. We do not request access to Gmail, Drive, contacts or other content in your Google account." : "Al crear una cuenta con Google, recibimos únicamente la información básica de perfil autorizada por Google: tu nombre, correo electrónico e identificador de cuenta. No solicitamos acceso a Gmail, Drive, contactos ni a otros contenidos de tu cuenta de Google."}</p>
      <p>{english ? "We also process data that you voluntarily save in the application, such as configurations, favorite components, builds, combos and conversations. To protect the service from abuse, we may record technical request data, such as a user identifier, a hash of the IP address, date, AI provider and usage metrics." : "También tratamos los datos que guardas voluntariamente en la aplicación, como configuraciones, componentes favoritos, builds, combos y conversaciones. Para proteger el servicio frente a abuso, podemos registrar datos técnicos de la solicitud, como un identificador de usuario, un hash de la dirección IP, fecha, proveedor de IA utilizado y métricas de uso."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Purposes and legal basis" : "Finalidades y base jurídica"}</h2>
      <p>{english ? "We use this data to create and maintain your account, provide requested features, save your preferences and settings, respond to support requests, maintain service security and prevent abuse. Processing needed for the account and its features is based on providing the requested service; communications with external AI providers require your prior confirmation." : "Usamos estos datos para crear y mantener tu cuenta, prestar las funciones solicitadas, guardar tus preferencias y configuraciones, responder a solicitudes de soporte, mantener la seguridad del servicio y prevenir usos abusivos. El tratamiento necesario para la cuenta y sus funciones se basa en la ejecución del servicio solicitado; las comunicaciones con proveedores externos de IA se realizan con tu confirmación previa."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Third-party services" : "Servicios de terceros"}</h2>
      <p>{english ? "Authentication, sessions and data storage are managed through Supabase. When you sign in with Google, Google processes authentication under its own policies. These providers are necessary services for CoreXScoring to operate." : "La autenticación, sesiones y almacenamiento de datos se gestionan mediante Supabase. Cuando usas Google para iniciar sesión, Google procesa la autenticación conforme a sus propias políticas. Estos proveedores actúan como servicios necesarios para que CoreXScoring funcione."}</p>
      <p>{english ? "We use Vercel Web Analytics to obtain aggregated audience and performance metrics, such as visited pages, general origin, approximate country and Web Vitals. This tool is not used for personalized advertising or individual profiling." : "Usamos Vercel Web Analytics para obtener métricas agregadas de audiencia y rendimiento, como páginas visitadas, procedencia general, país aproximado y Web Vitals. Esta herramienta no se usa para publicidad personalizada ni para crear perfiles individuales."}</p>

      <h2 className="font-display text-2xl font-bold text-white">CoreX AI</h2>
      <p>{english ? "If you choose to use CoreX AI with an external provider, currently OpenRouter, your message, the technical context strictly needed to respond and the results of queries made within CoreXScoring are sent to that provider. The interface asks for confirmation before the first message is sent to each provider and displays the effective provider in the chat." : "Si eliges usar CoreX AI con un proveedor externo, actualmente OpenRouter, se envían al proveedor tu mensaje, el contexto técnico estrictamente necesario para responder y los resultados de las consultas realizadas dentro de CoreXScoring. La interfaz solicita confirmación antes del primer envío a cada proveedor y muestra el proveedor efectivo en el chat."}</p>
      <p>{english ? "API keys you configure for your own provider are stored encrypted. They are not included in messages sent to the model. Each external provider's terms and privacy policies also apply; providers may process data outside the European Economic Area." : "Las claves API que configures para usar un proveedor propio se almacenan cifradas. No se incluyen dentro de los mensajes enviados al modelo. El uso de cada proveedor externo se rige además por sus propios términos y políticas de privacidad; dichos proveedores pueden tratar datos fuera del Espacio Económico Europeo."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Retention and deletion" : "Conservación y eliminación"}</h2>
      <p>{english ? "Saved conversations are kept for a maximum of 90 days from their last message and you can delete them from the history. Temporary chats are not saved as conversations. You can remove your own API keys and delete your account from settings; this deletes associated data according to the service's technical configuration." : "Las conversaciones guardadas se conservan durante un máximo de 90 días desde su último mensaje y puedes eliminarlas desde el historial. Los chats temporales no se guardan como conversaciones. Puedes retirar tus claves API propias y eliminar tu cuenta desde la configuración; al hacerlo se eliminan los datos asociados conforme a la configuración técnica del servicio."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Cookies and local storage" : "Cookies y almacenamiento local"}</h2>
      <p>{english ? <>We use essential cookies to maintain sessions and protect authenticated requests. Some preferences, such as comparison state, may be stored in the browser's local storage. Vercel Web Analytics collects aggregated metrics without advertising cookies. We do not sell personal data. See the <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/cookies">Cookie Policy</Link> for more information.</> : <>Usamos cookies esenciales para mantener la sesión y proteger solicitudes autenticadas. Algunas preferencias, como el estado del comparador, pueden guardarse en el almacenamiento local del navegador. Vercel Web Analytics recoge métricas agregadas sin cookies publicitarias. No vendemos datos personales. Consulta la <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/cookies">Política de cookies</Link> para más información.</>}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Your rights" : "Tus derechos"}</h2>
      <p>{english ? "If you live in the European Economic Area, you may request access, rectification, erasure, restriction or objection to processing, as well as portability where applicable. You may also withdraw consent for external AI providers by stopping their use. To exercise these rights, write to the email below. You may lodge a complaint with the Spanish Data Protection Agency if you believe processing does not comply with applicable law." : "Si resides en el Espacio Económico Europeo, puedes solicitar acceso, rectificación, supresión, limitación u oposición al tratamiento de tus datos, así como la portabilidad cuando corresponda. También puedes retirar el consentimiento para el uso de proveedores externos de IA dejando de utilizarlos. Para ejercer estos derechos, escríbenos al correo indicado abajo. Puedes presentar una reclamación ante la Agencia Española de Protección de Datos si consideras que el tratamiento no se ajusta a la normativa aplicable."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Changes to this policy" : "Cambios en esta política"}</h2>
      <p>{english ? "We may update this policy if the service features, providers or legal obligations change. The last update date shown at the end of the page indicates when the new version took effect." : "Podemos actualizar esta política si cambian las funciones del servicio, los proveedores utilizados o las obligaciones legales. La fecha de la última actualización mostrada al final de la página indicará cuándo entró en vigor la nueva versión."}</p>

      <h2 className="font-display text-2xl font-bold text-white">{english ? "Controller and contact" : "Responsable y contacto"}</h2>
      <p>{english ? <>The data controller is Rynaldo Bux, resident in Spain. For privacy questions or to exercise your rights, write to <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>.</> : <>El responsable del tratamiento es Rynaldo Bux, con residencia en España. Para consultas sobre privacidad o el ejercicio de tus derechos, escribe a <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>.</>}</p>

      <p className="text-sm text-zinc-500">{english ? "Last updated: September 15, 2026." : "Última actualización: 15 de septiembre de 2026."}</p>
    </LegalPage>
  );
}
