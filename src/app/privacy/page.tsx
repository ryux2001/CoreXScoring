import LegalPage from "@/ui/legal/LegalPage";

export const metadata = { title: "Política de privacidad | CoreXScoring" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>CoreXScoring usa los datos necesarios para autenticar cuentas, guardar configuraciones y ofrecer el catálogo, la bóveda y CoreX AI.</p>
      <h2 className="font-display text-2xl font-bold text-white">CoreX AI</h2>
      <p>La IA local procesa las solicitudes en el equipo configurado. Si se usa Groq, Cerebras, OpenRouter o una API key propia, el mensaje, el contexto técnico necesario y los resultados de tools pueden enviarse al proveedor seleccionado. CoreXScoring no envía API keys dentro del prompt.</p>
      <p>La interfaz solicita confirmación antes del primer envío a cada proveedor externo. El proveedor efectivo se muestra en el chat.</p>
      <h2 className="font-display text-2xl font-bold text-white">Conversaciones</h2>
      <p>Los chats guardados se conservan durante un máximo de 90 días. Puedes eliminarlos manualmente desde el historial. Los chats temporales no se guardan como conversaciones.</p>
      <h2 className="font-display text-2xl font-bold text-white">Tus derechos</h2>
      <p>Puedes eliminar conversaciones, retirar API keys propias y solicitar la eliminación de tu cuenta desde la configuración disponible. La eliminación de la cuenta elimina los datos asociados según las relaciones configuradas.</p>
      <p className="text-sm text-zinc-500">Última actualización: 13 de septiembre de 2026.</p>
    </LegalPage>
  );
}
