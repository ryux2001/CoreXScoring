# Etapas 5 y 6: limites, contexto y acciones de IA

Fecha de implementación: 2026-09-13.

## Política aprobada

| Control | Valor inicial |
| --- | ---: |
| Concurrencia global | 10 solicitudes |
| Concurrencia por usuario | 2 solicitudes |
| Concurrencia por IP anónima | 1 solicitud |
| Turnstile anónimo | Después de 3 mensajes |
| TTL de sesión anónima | 24 horas |
| Acciones pendientes activas | 5 por usuario |
| Circuit breaker | 5 fallos o 3 timeouts en 5 minutos |
| Enfriamiento del breaker | 5 minutos y una sonda |
| Rondas externas | 4 por solicitud |
| Tools por ronda | 3 |
| Lease de solicitud | 2 minutos |

Los valores viven en `public.ai_abuse_config` cuando son límites operativos y pueden modificarse sin cambiar la aplicación. El lease se libera en `finally` y expira automáticamente para protegerse contra procesos terminados abruptamente.

## Proveedores

- El proveedor gestionado inicial es únicamente OpenRouter.
- `AI_MANAGED_PROVIDERS` permite ampliar explícitamente los proveedores gestionados en el futuro; su valor predeterminado es `openrouter`.
- BYOK admite Groq, Cerebras y OpenRouter.
- BYOK no consume el presupuesto monetario gestionado de CoreX, pero sí usa cuotas, concurrencia, timeout y circuit breaker.
- Las claves BYOK se cifran en servidor y solo se descifran durante la llamada al proveedor elegido.

## Etapa 5

- `ai_request_leases` aplica límites atómicos globales, por usuario y por IP anónima.
- `ai_provider_circuit_state` registra fallos consecutivos, timeouts, ventana de fallos, enfriamiento y sonda de recuperación.
- El presupuesto OpenRouter conserva la reserva estimada cuando una inferencia termina con error; las respuestas exitosas se liquidan con el uso informado.
- El presupuesto y las cuotas se liquidan en éxito, guardrail y error.
- La señal de desconexión del request aborta la llamada al proveedor y no cuenta como fallo del circuito.
- Las sesiones anónimas caducadas reciben `anonymous_session_expired` y el cliente elimina su sesión local.
- `cleanup_ai_abuse_state` purga leases, estados antiguos del breaker y acciones expiradas; Supabase lo programa cada 15 minutos mediante `pg_cron`.

## Etapa 6

- Los drafts se reconstruyen desde IDs de productos consultados en servidor; los nombres y tipos enviados por cliente no se conservan.
- El prompt `system` solo recibe metadatos estructurales e IDs verificados, no nombres, títulos, descripciones, tags ni resúmenes de catálogo.
- Las capacidades de tools se derivan server-side de actor, intención, ruta y draft validado.
- Las tools privadas y de escritura siguen una segunda comprobación en `executeAiTool` y en cada handler.
- Las propuestas de escritura se crean mediante un RPC exclusivo de `service_role`, con límite de cinco acciones activas.
- Cada acción queda asociada al `request_id` server-side, expira, requiere confirmación, verifica ownership y recalcula el HMAC del payload con comparación constante.

## Evidencia local

- `pnpm exec vitest run tests/ai`: 94 tests pasados, 1 omitido.
- `pnpm exec tsc --noEmit`: pasado.
- Lint focalizado de los archivos modificados: pasado.
- `pnpm ci:local-smokes`: todos los smokes RLS/API pasados.
- Smoke específico de abuso: concurrencia de usuario/IP, circuit breaker y límite de acciones pasados.
- Migraciones locales aplicadas desde cero con `supabase db reset`.

## Antes de producción

- Configurar en Vercel `TRUSTED_PROXY=vercel`, `AI_MANAGED_PROVIDERS=openrouter` y las claves gestionadas reales.
- Configurar Turnstile con `AI_ANONYMOUS_TURNSTILE_REQUIRED=true`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` y hostname esperado.
- Confirmar límites monetarios de OpenRouter en Supabase y configurar el destinatario de alertas.
- Ejecutar una prueba dinámica autorizada sobre el proyecto real y registrar la evidencia de Etapa 13.
