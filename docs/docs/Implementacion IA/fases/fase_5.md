# Fase 5 — Bóveda, combos y builds con confirmación

> Estado: implementada en código; falta aplicar la migración de propuestas en Supabase y validar el flujo completo con una cuenta registrada.

## Objetivo

Permitir que CoreX AI consulte los combos y builds propios del usuario y prepare acciones sobre ellos sin escribir datos automáticamente. Toda mutación debe pasar por una propuesta temporal, una revisión visible y una confirmación explícita.

## Funcionalidades implementadas

- `search_user_combos`: consulta únicamente combos del usuario autenticado.
- `search_user_builds`: consulta únicamente builds del usuario autenticado.
- Las preguntas inequívocas de listado («¿tengo combos creados?», «muéstrame mis builds») se resuelven directamente en servidor, para que el modelo no pueda omitir la consulta de la bóveda.
- `propose_create_combo`: valida CPU, GPU, RAM y compatibilidad básica antes de preparar la propuesta.
- `propose_create_build`: valida los seis componentes y compatibilidad de plataforma antes de preparar la propuesta.
- `propose_set_custom_price`: prepara el cambio de precio de un combo o build propio.
- `plan_build`: resuelve los seis componentes de una build en una sola operación de catálogo y devuelve una recomendación sin crear una propuesta.
- `update_build_plan`: cambia únicamente los slots mencionados sobre el borrador activo y conserva los demás componentes.
- `save_build_draft`: convierte el borrador en una propuesta pendiente solo tras una petición explícita y exige un título elegido por el usuario.
- `plan_combo`: resuelve CPU, GPU y RAM y devuelve una recomendación en texto sin escribir.
- `update_combo_plan`: cambia solo los slots del combo mencionados por el usuario.
- `save_combo_draft`: prepara la confirmación del combo únicamente tras una petición explícita y exige título.
- `analyze_build`: obtiene una build pública y sus notas para una revisión de solo lectura.
- Tarjeta visual de confirmación con resumen de entidad, componentes, precio y caducidad.
- Confirmación y cancelación desde el chat.
- Gateway endurecido: bloquea texto que pretenda describir llamadas internas en vez de emitir `tool_calls` estructurados.
- Los respaldos de OpenRouter usan modelos fijos gratuitos con soporte de tools, nunca el enrutador variable `openrouter/free`. Groq sigue siendo el proveedor principal.
- Cadena de respaldo por cuota/rate limit/disponibilidad: Groq `gpt-oss-20b` → Groq `gpt-oss-120b` → Groq `qwen3.6-27b` → Cerebras `gpt-oss-120b` → OpenRouter `gpt-oss-20b:free` → OpenRouter `glm-4.5-air:free` → OpenRouter `qwen3-next-80b-a3b-instruct:free`.
- Si el proveedor corta por longitud, la interfaz muestra **Continuar respuesta**; la continuación no puede pedir acciones ni tools.
- Diagnóstico de fallos por proveedor, estado HTTP, etapa y motivo de finalización, sin registrar mensajes ni credenciales.
- El contexto del borrador se incorpora al único mensaje `system` inicial; no se insertan mensajes `system` adicionales entre el historial, porque las plantillas Jinja de llama.cpp los rechazan.
- Cuando Groq informa un límite temporal, la interfaz respeta `Retry-After`, muestra una cuenta regresiva y habilita el reintento al terminar.
- Las operaciones encadenadas externas pueden usar hasta seis rondas de tools; llama.cpp local dispone de hasta diez para consultas generales y de tres cuando la intención es crear una build completa. Cada ronda registra en servidor solo proveedor, modelo y nombres de tools para diagnosticar flujos sin exponer argumentos ni mensajes.
- Si un modelo de la cadena responde `404` porque fue retirado o no está habilitado, se omite ese candidato y se intenta el siguiente.
- Cada candidato fallido deja una línea `CoreX AI provider failed` en la terminal con proveedor, modelo, código, estado HTTP, duración y si se probará el siguiente; nunca se registran claves, prompts ni argumentos.
- Respuestas del proveedor con HTTP correcto pero cuerpo inválido se clasifican como `invalid_provider_payload`; el log de servidor incluye tipo y mensaje de excepción truncados, sin contenido conversacional.
- Los fallos al confirmar una escritura registran un código de Supabase y un `requestId` para diferenciar RLS, restricciones o incompatibilidades de esquema, sin incluir el payload de la propuesta.

Las sesiones anónimas pueden seguir conversando sobre hardware, pero no pueden consultar ni modificar la bóveda.

## Flujo técnico

```text
Usuario autenticado pide crear/editar algo
  ↓
El modelo invoca una tool de propuesta
  ↓
El servidor valida IDs, tipos, propiedad y compatibilidad
  ↓
Se guarda payload + digest HMAC + caducidad de 10 minutos
  ↓
La interfaz muestra la tarjeta de revisión
  ↓ Confirmar
El servidor consume la propuesta una sola vez
  ↓
Revalida componentes, permisos y compatibilidad
  ↓
Escribe en created_combos / created_builds
```

## Seguridad

- El `user_id` siempre proviene de la sesión Supabase del servidor.
- Las tools no reciben permisos para insertar, actualizar ni ejecutar SQL directamente.
- Las propuestas se almacenan en `ai_pending_actions`, están vinculadas al usuario y caducan.
- El digest HMAC impide alterar el payload desde el cliente.
- La RPC de consumo bloquea propuestas usadas, caducadas o pertenecientes a otra cuenta.
- La confirmación se revalida en servidor; no basta con enviar una frase como «confirmo».
- Las escrituras se filtran por `user_id` y dependen de las políticas RLS existentes de la bóveda.

## Archivos principales

- `src/lib/ai/actions.ts`: validación, creación de propuestas y ejecución confirmada.
- `src/lib/ai/vault-direct.ts`: detección y respuesta determinista para listados propios de la bóveda.
- `src/lib/ai/tools/definitions.ts`: contratos de tools de bóveda y propuestas.
- `src/lib/ai/tools/index.ts`: allowlist de handlers.
- `src/lib/ai/gateway.ts`: instrucciones de confirmación y propagación de `pendingAction`.
- `src/lib/ai/limits.ts`: telemetría extendida para incidencias del gateway.
- `src/app/api/ai/chat/route.ts`: rama protegida para confirmar una propuesta.
- `src/ui/ai/PendingActionCard.tsx`: revisión, confirmar y cancelar.
- `src/ui/ai/AISidebar.tsx`: estado y envío de confirmaciones.
- `supabase/migrations/20260823110000_ai_pending_actions.sql`: tabla y RPCs de propuestas.
- `supabase/migrations/20260823120000_ai_gateway_diagnostics.sql`: columnas y RPC de diagnóstico del gateway.
- `supabase/migrations/20260823130000_ai_cerebras_provider.sql`: habilita Cerebras en la restricción de telemetría.
- `supabase/migrations/20260823140000_ai_local_provider_constraint.sql`: habilita `local` en la restricción de telemetría para llama.cpp.

## Aplicación y prueba

Aplicar primero `20260823110000_ai_pending_actions.sql`, después `20260823120000_ai_gateway_diagnostics.sql`, `20260823130000_ai_cerebras_provider.sql` y finalmente `20260823140000_ai_local_provider_constraint.sql` en el SQL Editor de Supabase. La última migración es necesaria si se prueba con `AI_LOCAL_ENABLED=true`, aunque las tres migraciones anteriores ya estén aplicadas. Después, con una cuenta permanente:

1. Pedir a CoreX AI que consulte tus combos o builds.
2. Solicitar la creación de un combo/build usando IDs reales del catálogo.
3. Revisar la tarjeta y pulsar **Cancelar**; no debe aparecer ningún registro nuevo.
4. Repetir y pulsar **Confirmar**; debe aparecer en la bóveda.
5. Intentar confirmar de nuevo la misma propuesta; debe responder como propuesta usada o caducada.
6. Probar una combinación incompatible; la tool debe rechazarla antes de crear la propuesta.
7. Forzar temporalmente una respuesta larga y comprobar que aparece **Continuar respuesta** si el proveedor informa un corte por longitud.
8. Provocar una petición de tool fallida y revisar el dashboard: el error debe mostrar un código con la etapa (`provider`, `response` o `tool_loop`).

Configura `AI_ACTION_SECRET` como secreto independiente en producción. Si no está definido, el servidor usa como fallback un secreto privado ya existente, pero la variable independiente es la opción recomendada.

La cadena se configura sin exponer claves mediante `AI_GROQ_MODELS`, `AI_CEREBRAS_MODELS` y `AI_OPENROUTER_MODELS` (listas separadas por comas). Groq vuelve a ser el proveedor principal.

Para builds completas se prioriza `plan_build` sobre seis llamadas individuales a `search_components`. El gateway detecta esa intención y solo declara la tool de planificación al modelo durante ese turno; la recomendación se muestra en texto sin confirmación. Los cambios posteriores usan `update_build_plan` sobre un borrador canónico, de forma que un cambio de CPU y PSU no sustituye la GPU. Solo `save_build_draft`, después de una petición explícita y un título elegido por el usuario, crea la propuesta pendiente. Las tools consultan candidatos por tipo y los ordenan en el servidor, tolerando frases como «cualquier placa B550» o «SSD de 1TB», pero conservan la validación de IDs, tipos, compatibilidad, precios y confirmación existentes.

Los combos reutilizan el mismo flujo con tres slots (`cpu`, `gpu`, `ram`): `plan_combo`, `update_combo_plan` y `save_combo_draft`.

## Prueba temporal con llama.cpp local

Para validar esta fase sin consumir cuota de proveedores externos, el gateway puede usar primero un servidor local compatible con OpenAI, como `llama-server` de llama.cpp. Esta configuración es exclusiva de desarrollo y el servidor rechaza cualquier URL que no sea HTTP sobre loopback.

```env
AI_LOCAL_ENABLED=true
AI_LOCAL_ONLY=true
AI_LOCAL_BASE_URL=http://127.0.0.1:8080/v1
AI_LOCAL_MODEL=Qwen3.5-9B-UD-Q4_K_XL
# Opcional: solo si llama.cpp se inició con autenticación.
AI_LOCAL_API_KEY=
```

Con `AI_LOCAL_ENABLED=true`, el orden normal es `llama.cpp` local → Groq → Cerebras → OpenRouter. `AI_LOCAL_ONLY=true` desactiva estrictamente los proveedores externos y es el valor recomendado mientras se valida Fase 5 sin cuota. Las claves externas son opcionales para esta prueba: si no están configuradas, el proveedor local funciona de forma independiente. El modelo local debe aceptar `tools` y devolver `tool_calls` estructurados; si devuelve texto describiendo una tool, CoreX AI lo rechaza de forma segura.
