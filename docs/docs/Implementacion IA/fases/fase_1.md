# Fase 1 — Chat web mínimo viable

> Estado: implementada.
>
> Esta entrega corresponde funcionalmente a la **Fase 1** del plan: el usuario autenticado puede conversar con CoreX AI desde la web. También incluye parte de la base técnica de la Fase 0 (contratos, seguridad inicial y gateway), necesaria para que el chat no dependa directamente de un proveedor.

## 1. Objetivo de la fase

Construir la primera versión operativa del asistente de IA de CoreXScoring con estas características:

- Un único endpoint propio para las peticiones de IA.
- Chat disponible en las páginas principales de la aplicación.
- Groq como proveedor principal.
- OpenRouter como proveedor alternativo cuando Groq informa de cuota agotada o rate limit.
- Interfaz responsive: sidebar en escritorio/tablet y burbuja con panel modal en móvil.
- Acceso restringido a usuarios autenticados.
- Sin tools, búsqueda web, recomendaciones basadas en el catálogo ni modificaciones de datos todavía.

La API de OpenAI no forma parte de esta implementación. Las únicas integraciones de inferencia son Groq y OpenRouter.

## 2. Arquitectura implementada

```text
Usuario autenticado
        ↓
AISidebar
        ↓ POST /api/ai/chat
Validación de origen, JSON, historial y sesión Supabase
        ↓
AI Gateway (`src/lib/ai/gateway.ts`)
        ↓
Groq (principal)
        │
        └── 429 o insufficient_quota
                ↓
          OpenRouter (fallback)
        ↓
Respuesta normalizada al cliente
```

El navegador nunca llama directamente a Groq ni a OpenRouter. Las claves privadas permanecen en variables de entorno del servidor.

## 3. Backend

### 3.1 Tipos y validación del contrato

Archivo: `src/lib/ai/types.ts`

Se definieron los contratos básicos:

- `ChatMessage`: mensaje de usuario o asistente.
- `ChatRequest`: historial enviado al endpoint.
- `ChatResponse`: mensaje generado, proveedor utilizado y modelo.

También se añadieron límites de entrada:

- Máximo de 12 mensajes por petición.
- Máximo de 2.000 caracteres por mensaje.
- Solo se aceptan los roles `user` y `assistant`.
- Se eliminan espacios sobrantes antes de enviar el historial al proveedor.

Estos límites son una primera barrera de coste y tamaño. Todavía no constituyen un sistema completo de créditos o rate limiting.

### 3.2 Endpoint de chat

Archivo: `src/app/api/ai/chat/route.ts`

Endpoint público de aplicación:

```text
POST /api/ai/chat
Content-Type: application/json
```

El endpoint realiza las siguientes comprobaciones:

1. Valida el encabezado `Origin` cuando está presente.
2. Exige contenido `application/json`.
3. Analiza el cuerpo y valida el historial con `isChatRequest`.
4. Obtiene la sesión mediante Supabase Server Client.
5. Devuelve `401` si no hay usuario autenticado.
6. Ejecuta el gateway en servidor.
7. Devuelve `Cache-Control: no-store` para evitar cachear respuestas de IA.
8. Registra el fallo en servidor sin incluir API keys y devuelve un mensaje genérico al cliente.

La respuesta exitosa tiene esta forma:

```json
{
  "message": {
    "role": "assistant",
    "content": "..."
  },
  "provider": "groq",
  "model": "openai/gpt-oss-20b"
}
```

### 3.3 AI Gateway y proveedores

Archivo: `src/lib/ai/gateway.ts`

El gateway centraliza la comunicación con los dos proveedores mediante `fetch`; no se utiliza el SDK ni la API de OpenAI.

Configuración actual:

```env
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
AI_GROQ_MODEL=openai/gpt-oss-20b
AI_OPENROUTER_MODEL=openrouter/free
```

Reglas de selección:

- Cada petición comienza en Groq.
- Se cambia automáticamente a OpenRouter únicamente si Groq responde con HTTP `429` o con el código `insufficient_quota`.
- Un error de red, timeout, respuesta vacía o error genérico no activa el fallback automáticamente.
- El fallback se decide en backend; ni el modelo ni el cliente pueden escoger el proveedor.
- La respuesta informa qué proveedor y modelo terminaron atendiendo la petición.

El gateway utiliza un timeout de 25 segundos, limita la respuesta a 600 tokens y añade una instrucción de sistema temporal para que el modelo responda en español y no invente datos del catálogo.

### 3.4 Alcance deliberadamente limitado

En esta fase el asistente solo conversa. El prompt de sistema deja explícito que todavía no puede:

- Consultar productos reales de Supabase.
- Comparar componentes con datos internos.
- Consultar precios o stock.
- Crear builds o combos.
- Cambiar precios personalizados.
- Ejecutar acciones sobre la aplicación.

Esto evita presentar como información verificada una respuesta que todavía no está conectada a las fuentes de datos de CoreXScoring.

## 4. Interfaz de usuario

Archivo principal: `src/ui/ai/AISidebar.tsx`

### 4.1 Escritorio y tablet

- El chat se muestra como panel lateral fijo a la derecha.
- El panel ocupa `20rem` desde el breakpoint `md` y `22.5rem` en `lg`.
- El layout principal reserva ese espacio para que el panel no tape el contenido.
- El pie de página también respeta el espacio del sidebar.

Integración:

- `src/app/(main)/layout.tsx` monta el sidebar en las rutas principales.
- `src/app/page.tsx` también lo monta en la página de inicio.

### 4.2 Móvil

El componente tiene tres estados:

```text
collapsed → burbuja de IA
compact   → ventana reducida con el último contexto y entrada
expanded  → ventana ampliada con el historial completo
```

Controles incluidos:

- Botón flotante para abrir el chat.
- Botón para ampliar desde el modo reducido.
- Botón para reducir desde el modo ampliado.
- Botón para cerrar/minimizar y volver a la burbuja.
- Envío con botón o con `Enter`; `Shift + Enter` conserva el salto de línea.
- Botón para detener una respuesta en curso.
- Botón para reintentar el último mensaje si la petición falla.

## 5. Corrección del teclado virtual en móviles

Problema detectado: al enfocar el textarea, el teclado virtual reducía el viewport visual y podía cubrir la ventana del chat.

Solución aplicada:

- Se monitoriza `window.visualViewport`.
- Se calcula el espacio ocupado por el teclado (`keyboardInset`).
- Las ventanas compacta y ampliada se desplazan hacia arriba usando `bottom` dinámico.
- La altura de la ventana compacta se limita según el viewport disponible.
- No se enfoca automáticamente el textarea al abrir el modal; el usuario decide cuándo mostrar el teclado.
- Al abrir el modo ampliado se enfoca el control de cabecera, no el teclado.
- `Escape` cierra el chat móvil.
- El foco queda contenido en el diálogo ampliado mediante un control de tabulación.
- Al volver a la burbuja se devuelve el foco al botón correspondiente.

La corrección conserva el área visible del chat y evita que el teclado tape el campo de escritura o los controles.

## 6. Aviso temporal de la burbuja móvil

Cuando el chat está cerrado, la última respuesta del asistente se muestra como un aviso encima de la burbuja.

Comportamiento implementado:

- El aviso aparece al cargar la respuesta inicial.
- Cada nueva respuesta de la IA vuelve a mostrarlo y reinicia el temporizador.
- Desaparece automáticamente después de 5 segundos.
- El contenido se compacta reemplazando saltos de línea y espacios consecutivos.
- Si supera 120 caracteres, se recorta y se añade `...`.
- El recorte solo afecta al aviso visual; el historial conserva el mensaje completo.
- Pulsar el aviso abre el modo reducido del chat.

La lógica está encapsulada en `getMobileToastPreview` y en el estado `isMobileToastVisible`.

## 7. Seguridad y secretos

- Las API keys se leen exclusivamente desde variables de entorno del servidor.
- No se incluyen valores de claves en este documento, en el código fuente ni en los logs.
- El endpoint exige sesión autenticada antes de llamar a cualquier proveedor.
- Las respuestas de error al navegador no exponen detalles internos del proveedor.
- El gateway no acepta un proveedor enviado por el cliente.
- No hay llamadas directas desde el frontend a los proveedores.

## 8. Verificación realizada

Se ejecutaron estas comprobaciones sobre la implementación:

```text
ESLint dirigido a src/ui/ai/AISidebar.tsx       ✅
TypeScript (`tsc --noEmit`)                     ✅
git diff --check                                ✅
Detector de problemas visuales de Impeccable   ✅ sin hallazgos
```

El build global puede quedar limitado por el entorno si Next.js intenta descargar fuentes de Google durante la compilación; ese bloqueo pertenece a la configuración de fuentes/red existente y no al gateway ni al chat.

## 9. Qué queda fuera de esta fase

No se debe asumir que estas funcionalidades ya están implementadas:

- Tools para leer productos, combos o builds.
- Restricción especializada exclusivamente a temas de hardware mediante validación de dominio.
- Recomendaciones calculadas con datos reales.
- Búsqueda web de componentes o precios.
- Actualización de precios personalizados.
- Creación o modificación de builds y combos.
- Historial persistente de conversaciones.
- Cuotas diarias, créditos, rate limiting por usuario/IP y panel de consumo.
- API keys personales (BYOK).
- Confirmaciones para acciones que escriban datos.

Estas capacidades pertenecen a las fases siguientes y deben añadirse mediante tools tipadas y validadas, no mediante acceso directo del modelo a Supabase.

## 10. Criterio de cierre de la Fase 1

La fase se considera completada cuando:

- Un usuario autenticado puede abrir el chat desde escritorio, tablet y móvil.
- Puede enviar y recibir mensajes usando Groq.
- Si Groq devuelve cuota agotada o rate limit, la misma conversación puede continuar mediante OpenRouter.
- El usuario no necesita conocer ni introducir las API keys del proyecto.
- El teclado móvil no oculta la ventana de chat.
- El aviso de la burbuja no permanece estático indefinidamente y los mensajes largos se muestran truncados.
- Ninguna tool ni operación de escritura se ejecuta todavía.

## 11. Siguiente fase recomendada

La siguiente entrega debe ser la **Fase 2 — Especialización y guardrails de hardware**. Antes de conectar datos o acciones, conviene:

1. Definir qué preguntas están dentro y fuera del dominio de hardware.
2. Añadir una política de respuesta y rechazo para temas no relacionados.
3. Crear pruebas de evaluación en español.
4. Mantener la separación entre el modelo, las tools y las fuentes reales.
5. Después conectar las primeras tools de lectura de componentes en la fase de datos internos.
