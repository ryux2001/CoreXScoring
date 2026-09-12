# Pasos de implementación: asistente IA de CoreXScoring

> Estado: Fases 1, 2, 3 y 4 completadas; la limpieza de telemetría fue validada en Supabase. Este documento convierte el alcance de [Plan_IA_Web_Hardware.md](./Implementacion%20IA/Plan_IA_Web_Hardware.md) en fases pequeñas, verificables y compatibles con la arquitectura actual.

## 1. Punto de partida del proyecto

La aplicación ya tiene una base adecuada para que la IA trabaje con datos fiables:

- Next.js 16 con App Router, TypeScript estricto, Supabase Auth y Supabase como base de datos.
- Las vistas leen `products`, `products_with_priority`, `combos`, `builds`, `created_combos`, `created_builds` y `games`.
- El dominio no depende de la IA: `src/lib/scoring` calcula las notas de componentes, combos y builds; también existe lógica de compatibilidad de builds. Es la fuente de verdad que deben usar las tools.
- Las áreas privadas ya están protegidas por `src/proxy.ts` bajo `/vault`.
- El comparador es estado local de Zustand (`useCompareStore`) persistido en el navegador. Añadir al comparador no requiere escritura en Supabase.
- Solo existe actualmente un endpoint de aplicación (`/api/account/delete`), que valida origen, sesión y datos antes de una operación sensible. El endpoint de IA debe seguir este patrón.

El módulo `src/lib/ai` ya contiene el gateway, guardrails, tools de lectura, sesiones anónimas y la capa de cuotas/IP de la Fase 4. Las migraciones `20260822120000_ai_usage_and_quotas.sql`, `20260822130000_ai_admin_usage_rpc.sql` y `20260822140000_ai_quota_settlement.sql` deben aplicarse en Supabase antes de desplegar esta versión; todavía no existe un tipado generado de base de datos.

El chat puede usarse sin registro mediante Supabase Auth Anonymous Sign-Ins. El navegador crea la sesión anónima solo al enviar el primer mensaje y el servidor sigue identificando al actor por `user.id`; `user.is_anonymous` permite diferenciarlo de una cuenta permanente. Esta opción debe habilitarse en Supabase Dashboard, en **Authentication → Sign In / Providers → Anonymous Sign-Ins**. Las sesiones anónimas no deben acceder a la bóveda ni a acciones persistentes y requieren límites/CAPTCHA antes de un despliegue público.

## 2. Decisiones de arquitectura

### 2.1 Límite de responsabilidades

El asistente se presenta en un sidebar reutilizable dentro de `src/ui/ai`, pero toda interacción con modelos, proveedores, herramientas, límites y auditoría pasa por un único punto público:

```text
Cliente (AISidebar)
  -> POST /api/ai/chat
  -> AI Gateway (servidor)
  -> proveedor de modelo
  -> tools internas tipadas
  -> Supabase + módulos de scoring
```

`/api/ai/chat` es el único endpoint expuesto al navegador para conversar. Se podrá dividir internamente en módulos, pero no se crearán endpoints públicos por tool. Esto evita que el cliente pueda invocar acciones sensibles saltándose las comprobaciones comunes.

### 2.2 Proveedores, modelo y tool calling

Los únicos proveedores de inferencia de esta integración serán **Groq** y **OpenRouter**. No se utilizará la API de OpenAI ni se añadirá un adaptador de OpenAI.

- **Groq es el proveedor principal.** Todas las peticiones con claves del proyecto comienzan en Groq.
- **OpenRouter es el fallback automático.** Si el gateway detecta que Groq ha agotado su cuota o responde con un error de límite de cuota/rate limit, reintenta la misma petición en OpenRouter.
- El fallback lo decide exclusivamente el backend a partir de un error clasificado del proveedor. El modelo y el cliente no pueden seleccionarlo ni provocar el cambio.
- Para evitar duplicar efectos, el fallback se limitará inicialmente a turnos de solo lectura. Una petición con propuesta o confirmación de escritura conserva una clave de idempotencia y no se reintentará automáticamente después de que una acción haya podido ejecutarse.

Ambos adaptadores deben implementar la misma interfaz interna: instrucciones de servidor, historial limitado, mensajes, tool calls estructuradas y uso de tokens. Así, el resto de la aplicación no conoce el proveedor activo.

La secuencia de una tool siempre será:

```text
1. El modelo propone una llamada con argumentos JSON.
2. El gateway comprueba nombre, esquema, usuario, contexto y cuota.
3. La tool ejecuta código determinista con Supabase/scoring.
4. El gateway devuelve el resultado mínimo al modelo.
5. El modelo redacta la respuesta o prepara una propuesta de acción.
6. Una acción persistente solo se ejecuta tras confirmación explícita del usuario.
```

El modelo no recibe credenciales de Supabase, no genera SQL, no decide permisos y no ejecuta funciones arbitrarias.

### 2.3 Contexto de página y conversación

Cada mensaje incluirá un contexto mínimo, validado y no autoritativo:

```ts
type PageContext = {
  pathname: string;
  entity?: { kind: "product" | "combo" | "build"; id: string };
  comparisonIds: string[];
  currency: "EUR" | "USD";
};
```

El servidor vuelve a resolver `entity.id` y los productos solicitados; nunca confía en especificaciones, precios o permisos enviados por el cliente. El historial inicial se guarda en memoria del sidebar. La persistencia de conversaciones queda para una fase posterior para no aumentar coste, privacidad y complejidad antes de validar el MVP.

### 2.4 Acciones con confirmación

Una tool de lectura puede ejecutarse automáticamente. Una tool que cambie datos no lo hará. En vez de una escritura directa, el modelo devuelve una **propuesta** tipada (`pendingAction`) que la interfaz muestra al usuario. Tras pulsar «Confirmar», el cliente reenvía el identificador de propuesta al mismo endpoint y el servidor revalida todo.

| Tipo | Ejemplos | Ejecución |
| --- | --- | --- |
| Lectura | buscar producto, obtener specs, calcular notas, comparar | automática |
| UI local | añadir al comparador, navegar a una ficha | automática, mediante evento seguro del cliente |
| Persistente | crear/editar combo o build, cambiar precio personalizado | confirmación obligatoria |
| Externa | buscar precios, aplicar precios encontrados | confirmación obligatoria; límites específicos |
| Destructiva | borrar un elemento | fuera del alcance inicial; confirmación reforzada si se incorpora |

## 3. Estructura objetivo

```text
src/
  app/api/ai/chat/route.ts                # único endpoint público de IA
  lib/ai/
    gateway.ts                            # orquestación petición -> modelo -> tools
    contracts.ts                          # esquemas de request, respuesta y acciones
    prompts.ts                            # instrucciones versionadas por dominio
    limits.ts                             # cuotas y rate limiting
    provider.ts                           # interfaz común de proveedores
    providers/
      groq.ts
      openrouter.ts
    tools/
      catalog.ts                          # tools de productos, combos y builds públicos
      scoring.ts                          # adaptadores de src/lib/scoring
      vault.ts                            # lecturas y propuestas de datos del usuario
      actions.ts                          # validación/ejecución de propuestas confirmadas
      external-prices.ts                  # fase posterior
    telemetry.ts                          # métricas sin secretos ni texto sensible
  ui/ai/
    AISidebar.tsx
    AIChat.tsx
    ChatMessage.tsx
    PendingActionCard.tsx
    AISettingsPanel.tsx                   # fase BYOK
```

Se usarán esquemas en tiempo de ejecución (por ejemplo, Zod) para validar entrada HTTP, argumentos de tools y resultados. Los tipos de TypeScript por sí solos no bastan en un endpoint público.

## 4. Catálogo inicial de tools

Se implementan por valor y riesgo, no todas a la vez. Cada tool debe tener nombre estable, descripción concisa, esquema estricto, límite de resultados y respuesta reducida.

| Tool | Fase | Datos/fuente real | Riesgo |
| --- | ---: | --- | --- |
| `search_catalog` | 3 | `products_with_priority` | bajo |
| `get_product_details` | 3 | `products`, `games` si GPU | bajo |
| `get_combo_details` / `get_build_details` | 3 | `combos`, `builds` | bajo |
| `calculate_component_scores` | 3 | `getComponentNotes` | bajo |
| `calculate_combo_scores` / `calculate_build_scores` | 3 | `getComboNotes`, `getBuildNotes` y compatibilidad | bajo |
| `get_current_page_context` | 3 | contexto resuelto por servidor | bajo |
| `propose_add_to_comparison` | 3 | producto validado + estado local | bajo; efecto solo UI |
| `search_user_combos` / `search_user_builds` | 5 | filas propias con RLS/`user_id` | medio |
| `propose_create_combo` / `propose_create_build` | 5 | validación de slots y compatibilidad | alto; requiere confirmación |
| `propose_set_custom_price` | 5 | entidad propia + conversión de moneda | alto; requiere confirmación |
| `find_external_price` | 6 | proveedor de búsqueda y tiendas permitidas | medio/alto |
| `propose_apply_external_price` | 6 | resultado reciente y entidad propia | alto; requiere confirmación |

No se expondrán tools genéricas como `query_database`, `run_sql`, `fetch_url` o `execute_code`. Tampoco se enviará al modelo el catálogo completo: se consultará solo cuando la petición lo requiera y se limitarán los resultados.

## 5. Fases de implementación

### Fase 0 — Contrato, seguridad y observabilidad mínima

**Objetivo:** preparar los cimientos antes de que exista una experiencia visible.

- Configurar Groq como proveedor principal, OpenRouter como fallback y los modelos permitidos de ambos. Se debe comprobar que los modelos elegidos soportan tool calling fiable antes de activar tools.
- Añadir dependencias de servidor necesarias: SDK del proveedor y validación de esquemas.
- Crear `src/lib/ai/contracts.ts` con límite de longitud de mensaje, máximo de historial, `PageContext`, eventos de respuesta y `pendingAction`.
- Crear el endpoint `POST /api/ai/chat` con validación de `Content-Type`, origen, tamaño de cuerpo, sesión y respuestas de error normalizadas.
- Definir variables privadas en `.env.local.example`; ninguna clave debe usar `NEXT_PUBLIC_`.
- Definir un límite temporal por usuario e IP. Para producción, elegir un almacén compartido de rate limiting; un `Map` en memoria no funciona con múltiples instancias/serverless.
- Definir qué se registra: usuario seudonimizado, proveedor, modelo, latencia, uso de tokens, tool, resultado y error. No registrar API keys, cabeceras de autorización ni texto completo por defecto.
- Crear una matriz de pruebas de prompts: consultas permitidas, fuera de dominio, inyección de prompt, argumentos inválidos, cuenta sin sesión, cuota agotada y acciones sin confirmar.

**Criterio de salida:** una petición autenticada y una anónima reciben la respuesta/estado correcto sin llamar aún a ningún modelo; secretos y texto sensible no aparecen en logs.

### Fase 1 — Chat web mínimo viable

**Objetivo:** poder conversar con la IA desde cualquier página, sin tools ni acciones.

- Crear `AISidebar`, `AIChat`, `ChatMessage` y un botón accesible para abrir/cerrar el panel. Montarlo en `src/app/(main)/layout.tsx`, junto a Navbar y Footer, para que esté disponible en todas las rutas principales.
- Implementar estados de carga, cancelación, error, reintento y scroll de mensajes. Empezar con respuesta completa; añadir streaming SSE solo después de que el flujo no-streaming sea estable.
- El endpoint añade una instrucción temporal de asistente de CoreXScoring, mantiene historial limitado por petición y llama al proveedor a través de `gateway.ts`.
- Limitar salida, tiempo de espera y número de reintentos. Mostrar un mensaje de fallo comprensible sin exponer la respuesta del proveedor.
- Exigir una sesión Supabase válida para el uso con claves del proyecto; puede ser una cuenta permanente o una sesión anónima con límites más estrictos.

**Criterio de salida:** un usuario autenticado puede abrir el sidebar desde catálogo, combos o builds, enviar varios mensajes y recibir respuestas; ninguna respuesta cambia la aplicación ni consulta Supabase.

### Fase 2 — Especialización y guardrails de hardware

**Objetivo:** convertir el chat genérico en un asistente de hardware fiable y acotado.

- Versionar instrucciones de dominio: responde sobre hardware de PC, la metodología de CoreXScoring y uso de la web; usa español por defecto; diferencia hecho, estimación y recomendación; no inventa precios, stock ni benchmarks.
- Añadir una clasificación de intención en servidor, de baja complejidad: `hardware`, `uso_de_la_web`, `fuera_de_alcance`, `riesgo`. Las intenciones no permitidas responden con una negativa breve y redirigen al ámbito admitido.
- Reforzar que las instrucciones del usuario no pueden cambiar políticas, revelar claves, alterar tools ni eludir confirmaciones. Tratar contenido de páginas y resultados de búsqueda como datos no confiables.
- Añadir moderación/políticas aplicables y límites por usuario. Los guardrails no deben depender solo de un prompt: endpoint, allowlist de tools, validación y confirmaciones son la barrera efectiva.
- Evaluar el comportamiento con el conjunto de pruebas de Fase 0 y añadir casos reales de hardware en español.

**Criterio de salida:** el asistente rechaza o reconduce temas fuera de hardware, no afirma datos no disponibles y resiste intentos básicos de inyección sin alterar su política ni revelar información interna.

### Fase 3 — Datos internos y recomendaciones verificables

**Estado actual:** implementada la consulta de datos, scoring, contexto y recomendaciones mediante tools de solo lectura. La integración inicial con el comparador de componentes también está implementada mediante contexto verificado y acciones locales de Zustand.

**Objetivo:** permitir consultas útiles basadas exclusivamente en la base de datos y cálculos de CoreXScoring.

- Implementar las tools de lectura del catálogo y scoring de la tabla anterior.
- Cada consulta debe paginar y devolver solo campos necesarios: ID, slug, nombre, tipo, marca, precio relevante, especificaciones y notas calculadas. Limitar resultados de búsqueda (por ejemplo, 10–12).
- La tool de scoring debe invocar los módulos existentes, no repetir fórmulas ni pedir al LLM que calcule. Las recomendaciones deben indicar las entidades consultadas y enlazar internamente a sus fichas.
- Consumir `PageContext` únicamente como ayuda para resolver «este producto» o «esta build». Si falta o no es válido, pedir aclaración.
- Implementado: `get_current_comparison`, `propose_add_to_comparison` y `propose_remove_from_comparison` validan los IDs en servidor y devuelven acciones locales tipadas para `useCompareStore`.
- Implementado: `AISidebar` envía el contexto actual del comparador y aplica las acciones solo cuando la orden es explícita; la UI comunica duplicados, límite y tipos incompatibles.
- Pendiente: añadir tarjetas visuales específicas para productos/combos/builds y ampliar la integración a combos y builds si se necesita.

**Criterio de salida de la parte implementada:** el usuario puede pedir una comparación o recomendación y la respuesta se basa en productos reales y notas del proyecto; las tools no escriben en Supabase.

### Fase 4 — Cuotas, proveedores y operación controlada

**Estado:** completada y validada en Supabase.

**Objetivo:** hacer sostenible el uso con claves del proyecto antes de permitir acciones costosas.

- Crear tablas/migraciones para `ai_usage_daily`, `ai_action_logs` y `ai_quota_config` con RLS. El incremento de cuota se realiza con la RPC atómica `consume_ai_quota` y la liquidación con `settle_ai_quota`, nunca con un `select` seguido de `update` desde el cliente.
- Separar y configurar límites de mensajes y tokens por usuario y por IP, con valores iniciales conservadores para sesiones anónimas y cuentas registradas.
- La IP se normaliza en el endpoint y se persiste únicamente como HMAC (`ip_hash`), nunca en claro.
- Mantener la interfaz de proveedores encapsulada en el gateway actual: Groq se usa primero; OpenRouter se usa automáticamente cuando Groq informa de cuota agotada o rate limit. La elección y el fallback se hacen en servidor según error clasificado, nunca por el modelo. Un timeout no cambia de proveedor de forma predeterminada: primero se registra y se reintenta solo cuando la petición sea idempotente.
- Añadir `provider`, `model`, duración, token usage y tool calls a la telemetría; no incluir el mensaje íntegro.
- Implementado: añadir dashboard/consulta administrativa mínima de consumo, alertas para errores/bloqueos y control manual de retención.

**Criterio de salida:** las cuotas resisten peticiones simultáneas, el usuario recibe feedback útil al agotarlas, el fallback no duplica acciones ni supera el límite asignado, el panel permite revisar el consumo y la limpieza de telemetría está protegida y validada.

### Fase 5 — Bóveda, combos y builds con confirmación

**Estado:** implementada en código; falta aplicar `20260823110000_ai_pending_actions.sql` y validar el flujo de confirmación con una cuenta permanente.

**Objetivo:** que la IA prepare cambios valiosos sin poder modificar datos por sí sola.

- Añadir lecturas de datos propios del usuario. La sesión del endpoint determina el `user_id`; nunca se acepta desde el cliente ni desde argumentos del modelo. Aplicar RLS y una comprobación explícita de propiedad.
- Reutilizar las reglas existentes de los workspaces: slots requeridos, precio personalizado, conversión EUR/USD y validación de compatibilidad. Extraer reglas puras de los componentes de cliente cuando sea necesario para que servidor y UI compartan la misma lógica.
- Crear propuestas firmadas/almacenadas de vida corta con digest de argumentos, usuario y caducidad. Implementado mediante `ai_pending_actions`, `create_ai_pending_action` y `consume_ai_pending_action`; la confirmación revalida permisos, existencia de productos, compatibilidad y precios justo antes de escribir.
- Implementar primero `propose_create_combo`, luego `propose_create_build`, y después las actualizaciones de precio. Mostrar siempre el resumen completo de componentes, precio, moneda y consecuencias antes de confirmar.
- Invalidar/refrescar la ruta o el estado pertinente tras una escritura confirmada.

**Criterio de salida:** implementado en código. La validación final requiere aplicar la migración, confirmar una propuesta válida, comprobar cancelación sin escritura y verificar que una propuesta manipulada, caducada o de otro usuario no produce cambios.

### Fase 6 — Búsqueda externa de precios

**Objetivo:** incorporar precios de Internet sin confundirlos con datos internos ni automatizar cambios inseguros.

- Elegir un único proveedor de búsqueda y una allowlist inicial de tiendas. Prohibir scraping genérico hasta contar con permisos, términos y un diseño de mantenimiento por tienda.
- Diseñar `find_external_price` con entradas específicas (`productId`, tienda permitida, país/moneda) y resultados normalizados: URL, tienda, precio, moneda, disponibilidad, condición (nuevo/reacondicionado), fecha y confianza de coincidencia.
- Separar «encontrar» de «aplicar». Descartar marketplace, reacondicionados y coincidencias de baja confianza por defecto. Nunca sobrescribir un precio personalizado sin una tarjeta de confirmación visible.
- Aplicar límites de búsqueda y actualización independientes. Guardar evidencia mínima y fecha del resultado para trazabilidad, no asumir que un precio sigue vigente.
- Añadir mensajes claros cuando no se pueda verificar equivalencia exacta, stock o impuestos.

**Criterio de salida:** el usuario recibe candidatos trazables y puede aplicar manualmente uno a un componente propio; resultados ambiguos no se aplican.

### Fase 7 — BYOK, historial y optimización (posterior al MVP)

**Objetivo:** atender a usuarios técnicos sin rebajar la seguridad del gateway.

- Crear `AISettingsPanel` y permitir elegir proveedor/modelo permitido. El backend conserva la allowlist, límites de tools y permisos también para BYOK.
- **Decisión recomendada:** no considerar `localStorage` un almacén seguro de claves. Una clave ahí puede ser extraída por un XSS o extensión con acceso; Web Crypto no arregla por sí solo el problema si el código de la página puede descifrarla. Si se habilita el MVP local, debe ser opcional, con aviso explícito, nunca en logs y transmitida únicamente por HTTPS al gateway para esa petición.
- Para una versión sólida, almacenar claves cifradas en servidor con una clave gestionada fuera de Supabase, control de acceso por usuario, rotación, borrado y auditoría de último uso. El servidor no debe devolverlas de nuevo al navegador.
- Evaluar persistencia de conversaciones: consentimiento, política de retención, borrado del usuario, resumen/compactación de contexto y coste. Puede usarse estado de conversación del proveedor, pero la política de datos debe estar decidida antes de activarlo.
- Añadir streaming, caché de instrucciones y herramientas permitidas por contexto solo después de medir latencia y coste reales.

**Criterio de salida:** las claves propias no reducen permisos ni controles de la aplicación, se pueden eliminar, y el comportamiento de privacidad está documentado y probado.

## 6. Consideraciones transversales

### Seguridad y privacidad

- Validar todo en el servidor: request HTTP, contexto, argumentos, resultados, confirmaciones y propiedad de datos.
- Establecer timeouts, tamaño máximo de cuerpo, límite de historial y `max_tool_calls` por turno. Las tools no deben hacer llamadas paralelas ilimitadas.
- Aplicar RLS en las nuevas tablas y una comprobación adicional de `user_id` en las tools de escritura.
- Mantener claves de proyecto, Service Role y claves BYOK fuera de clientes, respuestas y logs. `SUPABASE_SERVICE_ROLE_KEY` no debe ser necesario para el flujo normal de IA.
- Versionar prompts, schemas y políticas; asociar esa versión a cada log para poder investigar regresiones.

### Calidad de las recomendaciones

- Usar términos como «recomendación según los datos de CoreXScoring» en vez de presentar una opinión del modelo como un hecho.
- Cuando falten datos, pedir requisitos concretos: presupuesto, moneda, uso, resolución, piezas ya disponibles y preferencias.
- Presentar incompatibilidades y límites de datos antes de recomendar. Los cálculos del proyecto prevalecen sobre cualquier inferencia del modelo.
- Crear un set de evaluación con productos reales, consultas de ambigüedad, comparativas, incompatibilidades, distintos presupuestos y ataques de prompt injection. No avanzar de fase si los casos críticos fallan.

### UX y accesibilidad

- El sidebar debe ser un diálogo accesible: foco inicial, foco atrapado mientras está abierto, Escape para cerrar, etiqueta clara, controles operables por teclado y no ocultar mensajes de error a lectores de pantalla.
- En móvil, usar un panel a pantalla completa o bottom sheet; no reducir la ficha de producto hasta dejarla inutilizable.
- Mostrar estado de herramienta («Buscando en el catálogo…») sin exponer argumentos internos ni secretos.
- Las tarjetas de confirmación deben describir qué se modificará y tener acciones separadas de confirmar/cancelar; no basarse en una frase en lenguaje natural como confirmación.

## 7. Orden recomendado de trabajo inmediato

1. Aprobar proveedor inicial, modelo, acceso solo autenticado y política de datos/conservación.
2. Crear Fase 0 y un endpoint simulado con sus contratos y pruebas.
3. Implementar y validar el chat de Fase 1.
4. Añadir los guardrails de Fase 2 antes de cualquier tool.
5. Entregar Fase 3 con datos internos y comparador; medir su utilidad y coste.
6. Aplicar la migración y validar cuotas/fallback (Fase 4); después avanzar a escrituras confirmadas (Fase 5) y búsqueda externa (Fase 6).

## 8. Decisiones que requieren confirmación antes de programar

- Modelo inicial de Groq, modelo de fallback en OpenRouter y presupuesto mensual máximo de cada proveedor. Los proveedores ya quedan fijados: Groq y OpenRouter; OpenAI queda fuera de alcance.
- Política de acceso anónimo: sesiones anónimas para consultas de hardware, con cuotas y límites por IP más estrictos.
- País/moneda y tiendas permitidas para la búsqueda externa.
- Si el producto acepta BYOK local temporalmente con el aviso de seguridad o se espera al almacenamiento cifrado en servidor.
- Política de retención para logs y, si se añade, historial de conversaciones.
- Esquema definitivo de créditos y límite por IP, usuario y proveedor.

## 9. Definición global de terminado

La integración estará preparada para producción cuando el endpoint sea el único acceso público a IA, las tools estén tipadas y autorizadas, cada mutación requiera una confirmación revalidada, las cuotas sean atómicas, no haya secretos en cliente/logs, los resultados externos tengan trazabilidad y el conjunto de evaluación cubra los flujos críticos de hardware en español.
