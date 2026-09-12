# Fase 7 — BYOK, historial y optimizaciones

> Estado: implementada en código. Falta aplicar la migración de Supabase de esta fase y validar el flujo completo con una cuenta registrada y una API key propia.

## Alcance implementado

- Configuración BYOK para Groq y OpenRouter.
- Allowlist de modelos controlada por servidor.
- Cifrado server-side de API keys y hints de los últimos cuatro caracteres.
- Modo `project` para claves de CoreX AI y modo `byok` para la clave del usuario.
- `AI_LOCAL_ONLY=true` mantiene Qwen local como único proveedor durante desarrollo.
- Historial de hasta diez conversaciones por usuario registrado.
- Renombrar y eliminar conversaciones.
- Chat temporal sin persistencia.
- Persistencia de mensajes, borradores de build/combo y resultados estructurados de búsquedas web.
- No se restauran propuestas pendientes porque son acciones caducables.
- Historial limitado a los últimos doce mensajes enviados al modelo.
- Historial responsive para escritorio y móvil.

## Archivos principales

### BYOK

- `src/lib/ai/chat-settings.ts`
- `src/lib/ai/provider-keys.ts`
- `src/lib/supabaseAdmin.ts`
- `src/app/api/vault/ai-provider/route.ts`
- `src/app/auth/components/AiChatProvidersCard.tsx`

### Historial

- `src/lib/ai/conversations.ts`
- `src/app/api/ai/conversations/route.ts`
- `src/app/api/ai/conversations/[id]/route.ts`
- `src/ui/ai/ChatHistoryPanel.tsx`
- `src/ui/ai/AISidebar.tsx`

### Base de datos

- `supabase/migrations/20260824110000_ai_phase_7_byok_conversations.sql`

## Variables de entorno

En producción se debe definir un secreto independiente para cifrar las keys:

```env
AI_PROVIDER_KEYS_ENCRYPTION_SECRET=...
```

Los modelos BYOK permitidos pueden limitarse por proveedor:

```env
AI_BYOK_GROQ_MODELS=...
AI_BYOK_OPENROUTER_MODELS=...
```

Si no se definen estas listas, se reutilizan los modelos configurados para el gateway del proyecto.

Durante desarrollo local:

```env
AI_LOCAL_ENABLED=true
AI_LOCAL_ONLY=true
AI_LOCAL_BASE_URL=http://127.0.0.1:8080/v1
AI_LOCAL_MODEL=Qwen3.5-9B-UD-Q4_K_XL
```

Con `AI_LOCAL_ONLY=true` no se lee ni se utiliza ninguna key BYOK.

## Aplicación de Supabase

La migración crea:

- `user_ai_chat_settings`
- `ai_conversations`
- `ai_conversation_messages`
- RPC atómica para crear conversaciones y guardar turnos.

Aplicar desde un proyecto Supabase enlazado:

```powershell
pnpm dlx supabase link --project-ref <tu-project-ref>
pnpm dlx supabase db push
```

También se puede ejecutar el contenido de la migración desde **Supabase Dashboard → SQL Editor**.

Comprobaciones básicas:

```sql
select
  to_regclass('public.user_ai_chat_settings') as ai_chat_settings,
  to_regclass('public.ai_conversations') as conversations,
  to_regclass('public.ai_conversation_messages') as messages;
```

```sql
select relname, relrowsecurity
from pg_class
where relname in (
  'user_ai_chat_settings',
  'ai_conversations',
  'ai_conversation_messages'
);
```

```sql
select user_id, count(*) as saved_chats
from public.ai_conversations
group by user_id
having count(*) > 10;
```

La última consulta debe devolver cero filas.

## Flujo BYOK

1. El usuario registrado abre la gestión de cuenta.
2. Selecciona `Mi API key`, proveedor y modelo permitido.
3. El servidor cifra y guarda la key; la respuesta solo contiene estado e hint.
4. El endpoint de chat carga la key únicamente en servidor.
5. El gateway utiliza solo el proveedor y modelo elegidos por el usuario.
6. Un fallo BYOK no hace fallback silencioso a las claves del proyecto.
7. El usuario puede eliminar la key y volver al modo de proyecto.

## Flujo de historial

- Chat temporal: mantiene el array de mensajes actual y nunca toca Supabase.
- Chat guardado nuevo: se crea en el primer turno que termina correctamente.
- Chat guardado existente: el servidor recupera la conversación por `user_id` y solo envía los últimos doce mensajes al modelo.
- El listado muestra título, fecha y número de mensajes.
- El título inicial usa el primer mensaje; el usuario puede renombrarlo.
- El borrado elimina la conversación y sus mensajes mediante la relación `on delete cascade`.

## Verificación realizada

```powershell
pnpm test:ai
```

La suite existente y los contratos de Fase 7 pasan. La evaluación real de Qwen local continúa siendo opt-in.

La compilación de Next.js compila correctamente el código de Fase 7 y el type-check llega a completarse. El build global queda condicionado por un problema previo del proyecto en `/vault/products`: usa `useSearchParams()` sin un límite `Suspense`.

## Pendiente antes de cerrar la fase

- Aplicar la migración `20260824110000_ai_phase_7_byok_conversations.sql`.
- Probar guardar, reemplazar y eliminar una key BYOK real.
- Probar crear, recargar, renombrar y eliminar chats con una cuenta registrada.
- Probar el límite del décimo chat y el comportamiento de chat temporal.
- Ejecutar la evaluación con Qwen local y validar el flujo BYOK con el proveedor de producción.
- Corregir el error preexistente de build de `/vault/products` antes de considerar el proyecto listo para producción.

## Fuera de alcance

- RAG, embeddings y vector database.
- Aplicación automática de precios externos.
- Pulido de extracción de precios y allowlist de Fase 6.
- Historial para usuarios anónimos.
- Streaming y resúmenes automáticos.
