# Runbooks de seguridad

## Clave filtrada

1. Revocar la clave en el proveedor, Supabase o GitHub inmediatamente.
2. Activar `AI_DISABLED=true` si la clave pertenece a un proveedor de IA.
3. Rotar el secreto en el gestor de despliegue y redeployar.
4. Ejecutar `pnpm test:ai` y los smokes locales.
5. Registrar alcance, hora de revocacion y usuarios potencialmente afectados.

## Abuso o gasto anomalo de IA

1. Activar `AI_DISABLED=true` o desactivar solo el proveedor afectado.
2. Reducir las cuotas en `ai_quota_config` si el incidente continua.
3. Revisar `ai_action_logs` por proveedor, estado, codigo de error e IP hash.
4. Revisar reservas en `ai_provider_cost_reservations` y alertas de presupuesto.
5. Rehabilitar proveedores gradualmente y confirmar el dashboard.

## Fallo RLS o acceso indebido

1. Desactivar el endpoint o despliegue afectado.
2. No borrar evidencias ni modificar datos antes de exportar metadatos minimos.
3. Ejecutar los smokes RLS sobre Supabase local para reproducir el fallo.
4. Revisar la migracion responsable y aplicar una correccion revisada.
5. Revocar sesiones o claves afectadas y documentar la comunicacion.

## Dependencia vulnerable

1. Confirmar version afectada con `pnpm audit --prod --audit-level=high`.
2. Abrir PR con lockfile actualizado y revisar cambios transitorios.
3. Ejecutar lint, tests, build, CodeQL y smokes locales.
4. Si no hay parche, aplicar mitigacion y registrar una fecha de retirada.

## Simulacro minimo

El responsable debe probar trimestralmente una clave de prueba, activar un kill switch, ejecutar los smokes y verificar que el correo de presupuesto llega sin incluir secretos, prompts o conversaciones.
