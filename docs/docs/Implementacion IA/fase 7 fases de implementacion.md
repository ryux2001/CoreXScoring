# Fase 7 — BYOK, historial y optimizaciones

> Estado: implementada en código. Falta aplicar la migración de Supabase y completar la validación manual con una cuenta registrada y una API key propia. Esta fase añade configuración de API key propia para IA, historial de conversaciones guardadas y optimizaciones de contexto, UI y operación. No incluye RAG ni cambios en la búsqueda externa de precios.

## Objetivo

Permitir que un usuario registrado use una API key propia de IA sin perder los controles de CoreX AI, y que gestione hasta diez conversaciones guardadas desde el sidebar. También debe poder iniciar un chat temporal, que conserva el funcionamiento actual: estado en memoria y ninguna escritura en Supabase.

Principios que no cambian:

- El único flujo que llama a modelos sigue pasando por `POST /api/ai/chat`.
- Las tools, cuotas, guardrails, permisos y confirmaciones se aplican igual con keys del proyecto, BYOK o proveedor local.
- Las API keys no se devuelven al navegador, no se registran en logs y no se incorporan al prompt.
- Qwen local conserva prioridad durante desarrollo cuando `AI_LOCAL_ONLY=true`.
- El historial no es RAG: el servidor envía al modelo solo un contexto corto y validado.

## Decisiones de diseño

| Tema | Decisión para esta fase |
| --- | --- |
| Proveedores BYOK | Groq y OpenRouter inicialmente. Cerebras queda fuera hasta que exista una necesidad concreta. |
| Modelos | El usuario elige únicamente entre modelos permitidos por el servidor. Nunca envía un ID de modelo libre. |
| Almacenamiento de keys | Cifrado AES-256-GCM en servidor, con secreto independiente. No `localStorage`. |
| Prioridad en desarrollo | `AI_LOCAL_ONLY=true` evita leer o consumir proveedores externos, incluidas keys BYOK. |
| Fallo de una key BYOK | No hay fallback automático a claves del proyecto. El usuario elige explícitamente volver al modo de proyecto. |
| Chats guardados | Solo cuentas permanentes; máximo 10 chats por usuario, impuesto por la base de datos. |
| Chat temporal | Solo memoria del `AISidebar`; no se crea conversación ni se persisten mensajes. |
| Contexto del modelo | Últimos 12 mensajes del chat guardado, obtenidos por el servidor. |
| Acciones pendientes | No se restauran al volver a abrir un chat; expiran y deben solicitarse de nuevo. |

## Orden de implementación

La fase se divide en seis entregas. Cada una puede verificarse antes de empezar la siguiente.

### Entrega 7.0 — Contratos y configuración central

**Objetivo:** definir los contratos de BYOK e historial antes de crear tablas o UI.

Cambios previstos:

- Añadir tipos para `AiCredentialMode`, `AiChatProvider`, `AiChatSettings`, `ConversationSummary`, `ConversationMessage` y `ConversationState`.
- Extender el contrato de chat con un modo explícito:
  - `temporary`: mantiene el array de mensajes actual, solo en memoria.
  - `saved`: recibe `conversationId` y el mensaje nuevo; el historial se recupera en servidor.
- Crear un módulo de configuración de modelos permitidos por proveedor. Los modelos vendrán de variables de entorno, no del cliente.
- Mantener `AI_LOCAL_ENABLED` y `AI_LOCAL_ONLY` como controles de desarrollo. El modo local no se mostrará como opción BYOK.
- Definir metadatos de conversación persistibles: borrador de build/combo y resultado estructurado de búsqueda web. `pendingAction` se excluye deliberadamente.

Variables previstas:

```env
# Obligatorio en producción; no reutilizar keys de proveedores.
AI_PROVIDER_KEYS_ENCRYPTION_SECRET=...

# Modelos que un usuario con su propia key puede elegir.
AI_BYOK_GROQ_MODELS=modelo-groq-permitido
AI_BYOK_OPENROUTER_MODELS=proveedor/modelo-qwen-permitido

# Límites de persistencia; no son límites de cuota del proveedor.
AI_SAVED_CHATS_MAX=10
AI_SAVED_CHAT_MESSAGES_MAX=150
```

Pruebas:

- Rechazar proveedor, modo, modelo o `conversationId` inválidos.
- Verificar que un modelo no incluido en la allowlist no llega al gateway.
- Verificar que el modo local estricto no prepara candidatos externos.

**Criterio de cierre:** existen tipos y validaciones compartidos; no hay todavía escritura en Supabase ni cambios visibles de UI.

### Entrega 7.1 — Migración de Supabase y capa segura de datos

**Objetivo:** crear almacenamiento de credenciales y conversaciones sin exponer claves ni permitir acceso entre usuarios.

Nueva migración propuesta:

```text
supabase/migrations/20260824110000_ai_phase_7_byok_conversations.sql
```

Tablas previstas:

```text
user_ai_chat_settings
- user_id uuid primary key -> auth.users(id) on delete cascade
- credential_mode: "project" | "byok"
- preferred_provider: "groq" | "openrouter"
- preferred_model: modelo permitido por servidor
- groq_api_key_ciphertext, groq_key_hint
- openrouter_api_key_ciphertext, openrouter_key_hint
- created_at, updated_at

ai_conversations
- id uuid primary key
- user_id uuid -> auth.users(id) on delete cascade
- title (1–80 caracteres)
- state jsonb (borrador de build/combo versionado, sin pendingAction)
- message_count
- created_at, updated_at, last_message_at

ai_conversation_messages
- id bigint identity primary key
- conversation_id uuid -> ai_conversations(id) on delete cascade
- role: "user" | "assistant"
- content (texto limitado)
- metadata jsonb (solo artefactos seguros como resultado de búsqueda web)
- created_at
```

Índices previstos:

- `ai_conversations (user_id, last_message_at desc)` para el listado del sidebar.
- `ai_conversation_messages (conversation_id, id)` para cargar mensajes ordenados.

Seguridad de Supabase:

- Activar RLS en las tres tablas.
- Las tablas de credenciales no tendrán política de lectura directa para el cliente.
- Crear RPCs `security definer`, con `set search_path = public` y comprobación de `auth.uid()`, para leer estado, actualizar keys y eliminarlas sin devolver ciphertext.
- Crear RPCs de conversación que validen propiedad antes de listar, cargar, renombrar, borrar o añadir mensajes.
- `create_ai_conversation` adquiere un bloqueo por usuario y rechaza la creación cuando ya existan diez chats; nunca borra conversaciones automáticamente.
- `append_ai_conversation_turn` guarda el mensaje del usuario y la respuesta final en una operación atómica y actualiza `last_message_at`.
- Al superar 150 mensajes, se conservan los más recientes. Esta retención debe ser visible en la documentación y UI si llega a aplicarse.

RPCs previstas:

```text
get_user_ai_chat_settings()
upsert_user_ai_chat_settings(provider, model, credential_mode, encrypted_key, key_hint)
remove_user_ai_chat_key(provider)
list_ai_conversations()
get_ai_conversation(conversation_id)
create_ai_conversation(title)
rename_ai_conversation(conversation_id, title)
delete_ai_conversation(conversation_id)
append_ai_conversation_turn(conversation_id, user_content, assistant_content, metadata, state)
```

Acciones para Supabase, una vez la migración exista:

```powershell
# Solo si el proyecto local todavía no está enlazado.
pnpm dlx supabase link --project-ref <tu-project-ref>

# Aplica todas las migraciones pendientes al proyecto enlazado.
pnpm dlx supabase db push
```

Alternativa: ejecutar el contenido completo de la migración en **Supabase Dashboard → SQL Editor**.

Consultas de verificación posteriores:

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

Pruebas:

- Una cuenta no puede recuperar, renombrar, borrar ni añadir mensajes a una conversación ajena.
- Una key se almacena cifrada y el endpoint solo devuelve `configured` e `hint`.
- La creación concurrente no permite superar diez chats.
- Borrar una conversación elimina sus mensajes en cascada.

**Criterio de cierre:** la migración se aplica correctamente y las RPCs funcionan con una cuenta registrada sin exponer secretos.

### Entrega 7.2 — API de configuración BYOK y selección en gateway

**Objetivo:** permitir guardar y usar una key propia sin cambiar las garantías actuales del gateway.

Cambios previstos:

- Crear endpoints autenticados para consultar, guardar, reemplazar, eliminar y probar una configuración BYOK.
- Reutilizar `encryptProviderApiKey` y `decryptProviderApiKey`, pero exigir `AI_PROVIDER_KEYS_ENCRYPTION_SECRET` en producción.
- Crear un servicio de servidor que resuelva la configuración efectiva de cada petición:
  1. Si `AI_LOCAL_ONLY=true`, usar exclusivamente llama.cpp local.
  2. Si el usuario seleccionó `byok`, cargar su key cifrada y crear únicamente candidatos de su proveedor/modelo permitido.
  3. Si el usuario seleccionó `project`, usar la cadena actual de Groq, Cerebras y OpenRouter.
- Mantener cuotas por usuario/IP incluso con BYOK, ya que protegen backend, Supabase y tools.
- Guardar en telemetría solo `credential_source` (`local`, `project`, `user`) y `conversation_id`; nunca keys ni texto.
- Añadir un botón opcional de «Probar conexión» que realice una comprobación mínima y muestre errores de autenticación sin revelar detalles del proveedor.

Pruebas:

- La key de usuario se prioriza sobre las claves del proyecto solo cuando el modo es BYOK.
- Un fallo BYOK no provoca fallback a una key del proyecto.
- Claves, ciphertext y cabeceras `Authorization` no aparecen en logs, errores o respuestas.
- La allowlist bloquea modelos no permitidos.

**Criterio de cierre:** un usuario puede configurar y eliminar su key de IA; CoreX AI la utiliza sin disminuir permisos, límites ni validaciones.

### Entrega 7.3 — Servicio de historial y chat persistente

**Objetivo:** integrar el historial guardado con `/api/ai/chat` sin confiar en mensajes enviados por el navegador.

Cambios previstos:

- Crear servicio de conversaciones para listar, cargar, renombrar, eliminar y persistir un turno completo.
- Añadir rutas autenticadas para gestión de historial:
  - `GET /api/ai/conversations`
  - `GET /api/ai/conversations/[id]`
  - `PATCH /api/ai/conversations/[id]`
  - `DELETE /api/ai/conversations/[id]`
- Adaptar `POST /api/ai/chat`:
  - En modo temporal conserva el contrato y comportamiento actuales.
  - En modo guardado, resuelve propiedad, carga los últimos 12 mensajes desde Supabase y persiste el turno únicamente después de una respuesta final válida.
  - El primer turno correcto crea la conversación con un título derivado del primer mensaje. No se utiliza otra llamada al modelo para generar títulos.
- Guardar resultados de búsqueda web como metadata segura para poder restaurar su tarjeta; no almacenar argumentos internos de tools.
- Restaurar el borrador de build/combo si existe, revalidándolo siempre antes de usarlo. No restaurar tarjetas de confirmación caducables.

Pruebas:

- Un chat temporal no hace lecturas ni escrituras en tablas de conversación.
- Un chat guardado carga el historial de servidor, no el historial manipulado por el cliente.
- Un fallo de proveedor no persiste un turno incompleto.
- El título, orden y fecha de actualización se comportan correctamente.

**Criterio de cierre:** recargar una conversación guardada conserva su historial útil; crear o usar un chat temporal no deja registros en Supabase.

### Entrega 7.4 — UI de historial y configuración

**Objetivo:** incorporar las nuevas capacidades al sidebar sin perjudicar el uso actual en escritorio o móvil.

Cambios previstos:

- Separar `AISidebar` en componentes más pequeños, por ejemplo:

```text
src/ui/ai/
  AISidebar.tsx
  ChatPanel.tsx
  ChatHistoryPanel.tsx
  ConversationRow.tsx
  RenameConversationDialog.tsx
  DeleteConversationDialog.tsx
  useAiConversation.ts
```

- En escritorio, añadir un botón de historial en la cabecera. Abrirá una vista interna del sidebar con:
  - «Nuevo chat guardado».
  - «Chat temporal».
  - Lista de hasta diez chats, con título y última actualización.
  - Acciones de renombrar y borrar por chat.
- En móvil, abrir el historial como una vista completa dentro del panel expandido, con botón de volver al chat. El panel compacto conservará su función actual de conversación rápida.
- Mostrar «Temporal · no se guarda» de forma visible cuando corresponda.
- Añadir `AiChatProvidersCard` a la página de cuenta, junto a la configuración existente de búsqueda web. Debe permitir seleccionar modo, proveedor, modelo, guardar/eliminar key y probar conexión.
- Mantener accesibilidad: foco controlado, Escape, nombres accesibles, diálogos reales de confirmación y restauración de foco tras borrar/renombrar.

Pruebas manuales:

- Escritorio: crear, seleccionar, renombrar y borrar chats sin perder el foco ni romper el scroll.
- Móvil: abrir historial desde panel expandido, volver a un chat, usar teclado virtual y cerrar correctamente.
- Temporal: navegar, cerrar y recargar; no debe aparecer en el listado.
- Cuenta: guardar, sustituir y eliminar una key sin que vuelva a mostrarse.

**Criterio de cierre:** la experiencia de escritorio y móvil mantiene el chat actual, hace evidente el modo temporal y permite gestionar el historial de forma accesible.

### Entrega 7.5 — Optimización, evaluación y despliegue

**Objetivo:** validar coste, latencia, límites y seguridad antes de activar la fase en producción.

Optimizaciones previstas:

- Para chats guardados, el cliente manda solo el mensaje nuevo; el servidor carga un historial acotado e indexado.
- Limitar tamaño de metadata, título, mensajes y estado JSON antes de persistirlos.
- Mantener el límite de 12 mensajes para contexto del modelo, aunque la UI conserve más historial.
- No añadir resumen automático ni streaming en esta primera entrega: ambos requieren medición de coste y latencia real.
- Añadir métricas agregadas de fuente de credencial, conversación y duración, sin almacenar contenido conversacional.

Suite de evaluación:

- BYOK: proveedor/modelo permitido, clave eliminada, error de autenticación y no fallback automático.
- Historial: ownership, límite de 10, borrado, renombrado, mensajes ordenados y chat temporal sin persistencia.
- Acciones: un borrador restaurado se revalida; una propuesta pendiente no se restaura.
- Regresión: guardrails, cuotas, tools, búsqueda externa y creación de builds/combos siguen pasando los tests existentes.
- Qwen local: ejecutar la evaluación opt-in sin claves externas cuando `AI_LOCAL_ONLY=true`.

Comandos de verificación previstos:

```powershell
pnpm test:ai
pnpm lint
pnpm test:ai:local-qwen
```

`pnpm test:ai:local-qwen` solo se ejecuta con llama.cpp/Qwen local activo; no debe formar parte del test habitual de CI.

**Criterio de cierre:** los tests críticos pasan, Supabase no expone claves, no hay más de diez chats por usuario y los tres modos —local, claves del proyecto y BYOK— respetan la política definida.

## Archivos previstos

```text
supabase/migrations/20260824110000_ai_phase_7_byok_conversations.sql

src/lib/ai/chat-settings.ts
src/lib/ai/conversations.ts
src/lib/ai/gateway.ts
src/lib/ai/types.ts
src/app/api/ai/chat/route.ts
src/app/api/ai/conversations/route.ts
src/app/api/ai/conversations/[id]/route.ts
src/app/api/vault/ai-provider/route.ts

src/ui/ai/AISidebar.tsx
src/ui/ai/ChatHistoryPanel.tsx
src/ui/ai/useAiConversation.ts
src/app/auth/components/AiChatProvidersCard.tsx
src/app/(main)/vault/account/page.tsx

tests/ai/byok.test.ts
tests/ai/conversations.test.ts
tests/ai/history-flows.test.ts
```

## Fuera de alcance

- RAG, embeddings, vector database o indexación documental.
- Aplicar automáticamente precios externos o pulir la extracción de Fase 6.
- Historial para sesiones anónimas.
- Cambiar de proveedor/modelo libremente sin allowlist de servidor.
- Fallback silencioso desde BYOK a claves del proyecto.
- Streaming y resúmenes generados automáticamente.

## Definición de terminado

La Fase 7 estará completada cuando un usuario registrado pueda elegir entre clave de proyecto o BYOK, guardar/renombrar/eliminar hasta diez chats, usar un chat temporal sin persistencia y recuperar una conversación sin que se expongan keys, se eludan límites o se restauren acciones caducables.
