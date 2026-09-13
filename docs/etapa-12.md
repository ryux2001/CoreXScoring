# Etapa 12: CI, observabilidad y respuesta

## CI

`.github/workflows/security-ci.yml` ejecuta en cada push a `main` y en cada pull request:

- `pnpm install --frozen-lockfile`
- lint de los archivos de seguridad, tests de IA, auditoria de produccion y build
- CodeQL para JavaScript/TypeScript
- Gitleaks para secretos
- smokes RLS y API contra Supabase local

El job de smokes usa Docker, aplica todas las migraciones y carga `supabase/seed.sql`. No usa credenciales de ningun proyecto remoto.

## Alertas de presupuesto

El endpoint `POST /api/ai/admin/budget-alerts` debe invocarse desde un cron seguro con:

```text
Authorization: Bearer $AI_ALERT_CRON_SECRET
```

Consulta el consumo OpenRouter diario y mensual, crea una alerta idempotente al 70% o 90% y envia un correo mediante Resend. Una alerta se vuelve a intentar si el envio falla.

Variables requeridas para el endpoint:

- `AI_ALERT_CRON_SECRET`
- `AI_ALERT_EMAIL_TO`
- `AI_ALERT_EMAIL_FROM`
- `RESEND_API_KEY`

## Kill switches

- `AI_DISABLED=true`: desactiva todas las peticiones de IA con HTTP 503.
- `AI_DISABLED_PROVIDERS=groq,cerebras,openrouter`: excluye proveedores concretos.
- `AI_LOCAL_ENABLED=true`: habilita el proveedor local.
- `AI_LOCAL_ONLY=true`: impide usar proveedores externos.

Los cambios de estos flags deben quedar registrados en el sistema de despliegue y revisarse tras el incidente.

## Evidencia operativa

Para ejecutar los smokes localmente con Docker:

```bash
pnpm ci:local-smokes
```

El runner inicia Supabase si no estaba iniciado, levanta un proveedor IA HTTP determinista para la prueba de chat y limpia el stack si lo inicio el mismo proceso.
