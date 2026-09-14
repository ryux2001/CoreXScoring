import LegalPage from "@/ui/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad | CoreXScoring",
  description: "Información sobre el tratamiento de datos personales en CoreXScoring.",
  alternates: { canonical: "https://corexscoring.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>Esta política explica cómo CoreXScoring trata los datos personales al usar el catálogo, las herramientas de comparación, la bóveda y CoreX AI. CoreXScoring es actualmente un proyecto personal y gratuito en fase inicial.</p>

      <h2 className="font-display text-2xl font-bold text-white">Datos que tratamos</h2>
      <p>Al crear una cuenta con email recopilamos el nombre, el correo electrónico y los datos necesarios para gestionar la autenticación. Si accedes con Google, recibimos únicamente la información básica de perfil autorizada por Google: tu nombre, correo electrónico e identificador de cuenta. No solicitamos acceso a Gmail, Drive, contactos ni a otros contenidos de tu cuenta de Google.</p>
      <p>También tratamos los datos que guardas voluntariamente en la aplicación, como configuraciones, componentes favoritos, builds, combos y conversaciones. Para proteger el servicio frente a abuso, podemos registrar datos técnicos de la solicitud, como un identificador de usuario, un hash de la dirección IP, fecha, proveedor de IA utilizado y métricas de uso.</p>

      <h2 className="font-display text-2xl font-bold text-white">Finalidades y base jurídica</h2>
      <p>Usamos estos datos para crear y mantener tu cuenta, prestar las funciones solicitadas, guardar tus preferencias y configuraciones, responder a solicitudes de soporte, mantener la seguridad del servicio y prevenir usos abusivos. El tratamiento necesario para la cuenta y sus funciones se basa en la ejecución del servicio solicitado; las comunicaciones con proveedores externos de IA se realizan con tu confirmación previa.</p>

      <h2 className="font-display text-2xl font-bold text-white">Servicios de terceros</h2>
      <p>La autenticación, sesiones y almacenamiento de datos se gestionan mediante Supabase. Cuando usas Google para iniciar sesión, Google procesa la autenticación conforme a sus propias políticas. Estos proveedores actúan como servicios necesarios para que CoreXScoring funcione.</p>

      <h2 className="font-display text-2xl font-bold text-white">CoreX AI</h2>
      <p>Si eliges un proveedor externo de IA, como Groq, Cerebras u OpenRouter, se envían al proveedor seleccionado tu mensaje, el contexto técnico estrictamente necesario para responder y los resultados de las consultas realizadas dentro de CoreXScoring. La interfaz solicita confirmación antes del primer envío a cada proveedor y muestra el proveedor efectivo en el chat.</p>
      <p>Las claves API que configures para usar un proveedor propio se almacenan cifradas. No se incluyen dentro de los mensajes enviados al modelo. El uso de cada proveedor externo se rige además por sus propios términos y políticas de privacidad; dichos proveedores pueden tratar datos fuera del Espacio Económico Europeo.</p>

      <h2 className="font-display text-2xl font-bold text-white">Conservación y eliminación</h2>
      <p>Las conversaciones guardadas se conservan durante un máximo de 90 días desde su último mensaje y puedes eliminarlas desde el historial. Los chats temporales no se guardan como conversaciones. Puedes retirar tus claves API propias y eliminar tu cuenta desde la configuración; al hacerlo se eliminan los datos asociados conforme a la configuración técnica del servicio.</p>

      <h2 className="font-display text-2xl font-bold text-white">Cookies y almacenamiento local</h2>
      <p>Usamos cookies esenciales para mantener la sesión y proteger solicitudes autenticadas. Algunas preferencias, como el estado del comparador, pueden guardarse en el almacenamiento local del navegador. No usamos cookies publicitarias ni vendemos datos personales. Consulta la <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/cookies">Política de cookies</a> para más información.</p>

      <h2 className="font-display text-2xl font-bold text-white">Tus derechos</h2>
      <p>Si resides en el Espacio Económico Europeo, puedes solicitar acceso, rectificación, supresión, limitación u oposición al tratamiento de tus datos, así como la portabilidad cuando corresponda. También puedes retirar el consentimiento para el uso de proveedores externos de IA dejando de utilizarlos. Para ejercer estos derechos, escríbenos al correo indicado abajo. Puedes presentar una reclamación ante la Agencia Española de Protección de Datos si consideras que el tratamiento no se ajusta a la normativa aplicable.</p>

      <h2 className="font-display text-2xl font-bold text-white">Cambios en esta política</h2>
      <p>Podemos actualizar esta política si cambian las funciones del servicio, los proveedores utilizados o las obligaciones legales. La fecha de la última actualización mostrada al final de la página indicará cuándo entró en vigor la nueva versión.</p>

      <h2 className="font-display text-2xl font-bold text-white">Responsable y contacto</h2>
      <p>El responsable del tratamiento es Rynaldo Bux, con residencia en España. Para consultas sobre privacidad o el ejercicio de tus derechos, escribe a <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">corexscoring@gmail.com</a>.</p>

      <p className="text-sm text-zinc-500">Última actualización: 14 de septiembre de 2026.</p>
    </LegalPage>
  );
}
