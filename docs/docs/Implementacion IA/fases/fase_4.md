# Fase 4 — Cuotas, IP y operación controlada

> Estado: completada. Panel administrativo, alertas, cuotas por usuario/IP, liquidación de tokens y limpieza de telemetría validados en Supabase.

## Objetivo

Controlar el consumo de CoreX AI antes de enviar una petición a Groq u OpenRouter, evitando que cambiar de cuenta, navegador o sesión anónima permita evadir completamente los límites.

## Flujo

```text
Petición autenticada o anónima
  ↓
Supabase Auth obtiene user.id
  ↓
El servidor obtiene la IP del proxy y guarda solo un HMAC
  ↓
RPC atómica consume buckets diarios de usuario e IP
  ↓ si está permitido
Groq → OpenRouter cuando corresponde
  ↓
RPC registra proveedor, modelo, duración, tokens y estado
```

## Cuotas configuradas

Los valores se almacenan en `public.ai_quota_config` para poder ajustarlos sin cambiar el código.

### Valores actualmente activos

Estos son los límites aplicados actualmente en el proyecto:

| Bucket | Invitado/anónimo | Cuenta registrada |
| --- | ---: | ---: |
| Mensajes diarios por usuario | 5 | 50 |
| Tokens diarios contabilizados por usuario | 15 000 | 120 000 |
| Mensajes diarios por IP | 15 | 150 |
| Tokens diarios contabilizados por IP | 45 000 | 360 000 |

### Valores por defecto de la migración

Si se instala la migración en un proyecto nuevo sin modificar la configuración, los valores iniciales son 20/200 mensajes por usuario y 60/500 mensajes por IP. En este proyecto ya fueron sustituidos por los valores activos de la tabla anterior.

La cuota reserva tokens antes de llamar al proveedor para proteger peticiones concurrentes. Cuando Groq u OpenRouter informan el uso, la RPC `settle_ai_quota` sustituye la reserva por los tokens reales; si el proveedor no informa uso, la reserva se conserva como protección conservadora.

## IP y privacidad

- Se lee `x-forwarded-for` o `x-real-ip` en el servidor, no desde el navegador.
- La IP nunca se persiste en claro; se guarda un HMAC SHA-256 en `ip_hash`.
- Se recomienda configurar `AI_IP_HASH_SECRET` como secreto independiente en producción.
- La IP es un límite secundario: no reemplaza a `user.id`, porque una red puede ser compartida o cambiar con frecuencia.

## Archivos principales

- `src/lib/ai/limits.ts`: extracción de IP, HMAC, estimación de tokens, consumo RPC y telemetría.
- `src/app/api/ai/chat/route.ts`: aplica la cuota antes del gateway y devuelve `429` con `Retry-After` cuando corresponde.
- `src/app/api/ai/admin/usage/route.ts`: consulta administrativa protegida, con períodos de 1 a 31 días.
- `src/app/api/ai/admin/cleanup/route.ts`: limpieza manual de telemetría, restringida a administradores y con retención de 30–730 días.
- `src/app/(main)/vault/admin/ai/page.tsx`: panel administrativo protegido por sesión y `app_metadata.role`.
- `src/app/(main)/vault/admin/ai/AdminAiDashboard.tsx`: cuotas, uso, proveedores, alertas y control de limpieza.
- `src/lib/ai/gateway.ts`: acumula tokens y tool calls de las rondas del proveedor.
- `supabase/migrations/20260822120000_ai_usage_and_quotas.sql`: tablas, RLS y funciones atómicas.
- `supabase/migrations/20260822130000_ai_admin_usage_rpc.sql`: RPC administrativa protegida por `app_metadata.role`.
- `supabase/migrations/20260822140000_ai_quota_settlement.sql`: liquidación de reservas con uso real.
- `supabase/migrations/20260823100000_ai_telemetry_retention.sql`: RPC administrativa para retención y limpieza.

## Aplicación de la migración

Las migraciones de cuotas, consulta administrativa y liquidación de tokens ya fueron ejecutadas en el proyecto Supabase. La migración de retención debe aplicarse antes de usar el botón de limpieza del panel. Si las funciones RPC no existieran en otro entorno, los endpoints fallarían cerrado con `503` para no consumir las claves de los proveedores sin control.

Después de aplicar la migración, revisar y ajustar `public.ai_quota_config` según el uso real. Las tablas no permiten lectura o escritura directa desde clientes; las únicas operaciones de la aplicación pasan por las funciones `consume_ai_quota` y `record_ai_request`.

## Proveedores y fallback

El gateway mantiene Groq como proveedor principal y OpenRouter como fallback únicamente ante cuota agotada o rate limit clasificado. La telemetría registra el proveedor que respondió, el modelo, la latencia, tokens, tool calls y estado, sin almacenar el texto completo de la conversación ni claves.

## Operación posterior

- Activar Anonymous Sign-Ins y CAPTCHA/Turnstile en Supabase.
- Configurar `AI_IP_HASH_SECRET` en cada entorno.
- Probar cuotas concurrentes y confirmar que el `429` incluye `Retry-After`.
- Mantener la cuenta administrativa y asignar `raw_app_meta_data.role = 'admin'` solo desde un entorno de confianza.
- Programar la ejecución periódica de la RPC de limpieza en un job confiable cuando el despliegue tenga scheduler; el botón actual es manual y explícito.

## Consulta para cambiar los límites

Ejecuta esta consulta en el **SQL Editor de Supabase** y cambia los valores numéricos según sea necesario. Los límites se aplican a partir de las siguientes peticiones y no requieren modificar el código.

```sql
update public.ai_quota_config
set
  anonymous_daily_messages = 5,
  anonymous_daily_tokens = 15000,
  authenticated_daily_messages = 50,
  authenticated_daily_tokens = 120000,
  anonymous_ip_daily_messages = 15,
  anonymous_ip_daily_tokens = 45000,
  authenticated_ip_daily_messages = 150,
  authenticated_ip_daily_tokens = 360000,
  updated_at = now()
where singleton is true;

-- Verificar la configuración activa
select
  anonymous_daily_messages,
  anonymous_daily_tokens,
  authenticated_daily_messages,
  authenticated_daily_tokens,
  anonymous_ip_daily_messages,
  anonymous_ip_daily_tokens,
  authenticated_ip_daily_messages,
  authenticated_ip_daily_tokens,
  updated_at
from public.ai_quota_config
where singleton is true;
```

La primera pareja de columnas limita a cada usuario; la segunda limita por IP. Las sesiones anónimas y las cuentas registradas tienen límites separados. No coloques claves de Groq u OpenRouter en esta tabla.
