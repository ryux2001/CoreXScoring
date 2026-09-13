import LegalPage from "@/ui/legal/LegalPage";

export const metadata = { title: "Términos de uso | CoreXScoring" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos de uso">
      <p>CoreXScoring ofrece información y herramientas orientativas para comparar componentes y crear configuraciones de PC.</p>
      <h2 className="font-display text-2xl font-bold text-white">Uso de CoreX AI</h2>
      <p>Las respuestas pueden contener errores. Debes verificar precios, compatibilidad, disponibilidad y rendimiento antes de tomar decisiones de compra. Las acciones que modifican datos requieren confirmación explícita.</p>
      <h2 className="font-display text-2xl font-bold text-white">Proveedores</h2>
      <p>El uso de proveedores externos de IA está sujeto también a sus propios términos y políticas. No introduzcas secretos, contraseñas ni información que no quieras compartir con el proveedor elegido.</p>
      <h2 className="font-display text-2xl font-bold text-white">Conducta</h2>
      <p>No está permitido abusar de las cuotas, intentar acceder a datos de otras cuentas, eludir controles de seguridad o usar la aplicación para actividades ilícitas.</p>
      <p className="text-sm text-zinc-500">Última actualización: 13 de septiembre de 2026.</p>
    </LegalPage>
  );
}
