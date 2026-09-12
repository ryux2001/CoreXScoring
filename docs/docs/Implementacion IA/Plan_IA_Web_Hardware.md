# Plan de integración de IA en la web de hardware

## 1. Objetivo

Integrar un asistente de IA en forma de panel lateral disponible en toda la web.

La IA debe servir como una interfaz natural para interactuar con la aplicación: consultar componentes, comparar productos, crear combos/builds, modificar precios personalizados y, más adelante, buscar precios externos en tiendas.

La idea no es integrar “un chatbot genérico”, sino crear un **AI Gateway propio** con proveedores intercambiables, límites internos y acciones controladas sobre la web.

---

## 2. Alcance inicial

Para no saturar el proyecto, la primera versión se centrará en:

- API keys de IA y de web search guardadas localmente en el navegador.
- Uso híbrido de **Groq** y **OpenRouter**.
- Groq como proveedor principal por defecto.
- OpenRouter como fallback configurable cuando se agote cuota, falle el proveedor o se decida desde código.
- Sin plan premium de momento.
- Solo dos modos:
  - **Tier Free**: usa las API keys del proyecto con límites.
  - **Tier Técnico**: el usuario usa sus propias API keys.

---

## 3. Concepto de producto

### 3.1 Tier Free

El usuario usa la IA sin configurar nada.

Características:

- Usa las API keys propias del proyecto.
- Tiene límites diarios o mensuales.
- Está pensado para usuarios normales.
- Permite acciones básicas con la web.

Acciones incluidas inicialmente:

- Solicitar información de componentes.
- Comparar componentes, combos o builds.
- Leer builds y combos.
- Crear builds o combos.
- Pedir conclusiones sobre un componente, combo o build.
- Pedir recomendaciones.
- Añadir productos a comparativa.
- Modificar precios personalizados de forma controlada.
- Buscar precios externos con límites bajos.

### 3.2 Tier Técnico

El usuario avanzado puede introducir sus propias API keys.

Características:

- Puede usar su propia API key de IA.
- Puede usar su propia API key de web search.
- Las keys se guardan inicialmente en local, no en la base de datos.
- El coste/cuota depende del proveedor del usuario.
- La web sigue aplicando límites internos de seguridad.
- Todas las acciones siguen pasando por el backend.

Este modo está pensado para usuarios que ya tienen cuenta en Groq, OpenRouter, Tavily, Brave Search, etc.

---

## 4. Decisión importante sobre API keys

### 4.1 En la primera versión

Las API keys personalizadas del usuario se guardarán en local.

Opciones posibles:

- `localStorage`
- `sessionStorage`
- almacenamiento local cifrado mediante Web Crypto

Para el MVP, la opción más simple sería `localStorage`, sabiendo que no es la opción más segura.

Ejemplo conceptual:

```ts
localStorage.setItem("ai_provider", "groq");
localStorage.setItem("ai_api_key", "...");

localStorage.setItem("web_search_provider", "tavily");
localStorage.setItem("web_search_api_key", "...");
```

### 4.2 Regla de seguridad

Aunque la API key esté en local, el frontend **no debería llamar directamente** a Groq, OpenRouter o Tavily.

Flujo correcto:

```text
Frontend
  ↓
/api/ai/chat
  ↓
Backend propio
  ↓
Proveedor IA / proveedor web search
```

Esto permite:

- Validar acciones.
- Aplicar límites.
- Registrar uso.
- Controlar modelos permitidos.
- Evitar llamadas peligrosas.
- Bloquear acciones no autorizadas.
- Contar búsquedas web.
- Proteger la lógica interna de la aplicación.

### 4.3 Versión futura

Más adelante se puede añadir guardado seguro en servidor:

```text
user_api_keys
- id
- user_id
- type              // "ai" | "web_search"
- provider          // "groq" | "openrouter" | "tavily" | ...
- encrypted_key
- created_at
- last_used_at
```

En esa fase, las API keys se cifrarían en servidor y nunca se devolverían al frontend.

---

## 5. Proveedores de IA

### 5.1 Proveedores iniciales

Inicialmente se usarán:

- **Groq**
- **OpenRouter**

Groq será el proveedor principal.

OpenRouter se usará como alternativa o fallback.

### 5.2 Estrategia híbrida

La aplicación debe permitir decidir desde código cuándo usar cada proveedor.

Ejemplos de configuración:

```env
AI_DEFAULT_PROVIDER=groq
AI_DEFAULT_MODEL=llama-3.1-8b-instant

AI_FALLBACK_PROVIDER=openrouter
AI_FALLBACK_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

Ejemplo de lógica:

```ts
if (userHasCustomAIKey) {
  useUserProvider();
} else {
  try {
    useGroq();
  } catch (error) {
    if (shouldFallbackToOpenRouter(error)) {
      useOpenRouter();
    }

    throw error;
  }
}
```

### 5.3 Cuándo cambiar de Groq a OpenRouter

El cambio debería poder decidirse por código.

Casos posibles:

- Groq devuelve rate limit.
- Groq devuelve error temporal.
- Groq agota cuota.
- El modelo configurado no soporta bien tool calling.
- El usuario elige OpenRouter manualmente.
- Se quiere probar un modelo concreto de OpenRouter.

No conviene que el modelo decida esto. Debe decidirlo el backend.

---

## 6. Web search

### 6.1 Idea general

Groq no es un sistema de búsqueda web. Sirve como proveedor de inferencia/modelos.

Por tanto, para buscar precios actuales en Internet hará falta una herramienta aparte.

Opciones posibles:

- Tavily
- Brave Search API
- SerpAPI
- Exa
- scraping propio controlado
- integración específica con tiendas concretas

Para el MVP, lo recomendable es empezar con una herramienta simple, por ejemplo Tavily, y limitar mucho su uso.

### 6.2 No hacer búsqueda web libre al principio

No conviene empezar con una herramienta genérica tipo:

```ts
searchWeb("precio RTX 5070 Ti PcComponentes");
```

Es mejor crear herramientas específicas y controladas.

Ejemplo:

```ts
findExternalPrice({
  componentId: "gpu_123",
  retailer: "pccomponentes"
});
```

Ventajas:

- Controlas qué tiendas se permiten.
- Validar que el producto sea correcto.
- Evitas resultados antiguos o incorrectos.
- Puedes comprobar si está en stock.
- Puedes evitar reacondicionados o marketplace.
- Puedes pedir confirmación antes de aplicar el precio.

### 6.3 API key personalizada para web search

Igual que con la IA, el usuario técnico podrá usar su propia API key de búsqueda.

Ejemplo de ajustes:

```text
Proveedor de búsqueda web:
- Usar búsquedas gratis de la web
- Tavily
- Brave Search
- SerpAPI
- Exa

API key búsqueda:
[************************]
```

La aplicación decidirá qué key usar:

```ts
const searchKey =
  userLocalSearchApiKey ??
  process.env.DEFAULT_WEB_SEARCH_API_KEY;
```

---

## 7. Límites y créditos

### 7.1 Separar tipos de uso

No todo consume igual.

Conviene separar:

```text
AI messages quota
Web search quota
Action quota
External price update quota
```

### 7.2 Sistema de créditos

Ejemplo inicial:

```text
Mensaje simple                    1 crédito
Comparar componentes              2 créditos
Crear combo                       4 créditos
Crear build completa              8 créditos
Buscar precio en web              10 créditos
Actualizar precios desde web      15 créditos
```

Esto permite que acciones caras consuman más que mensajes simples.

### 7.3 Límites recomendados para el Tier Free

Ejemplo inicial:

```text
30 mensajes IA/día
10 acciones/día
3 búsquedas de precios/día
1 actualización externa de precios/día
```

Estos valores deben ser fáciles de cambiar por configuración.

### 7.4 Límites para Tier Técnico

Aunque el usuario use su propia API key, deben existir límites internos.

Ejemplo:

```text
100 acciones/día
20 búsquedas de precios/día
máximo 5 componentes por búsqueda masiva
máximo 3 tiendas por componente
rate limit por IP y usuario
```

Motivo: aunque el coste de IA lo pague el usuario, la carga sobre el backend y Supabase sigue siendo de la aplicación.

---

## 8. Arquitectura general

```text
Usuario
  ↓
AISidebar
  ↓
/api/ai/chat
  ↓
AI Gateway propio
  ↓
┌──────────────────────────────────────┐
│ Decide proveedor                     │
│                                      │
│ 1. Si hay API key propia             │
│    → usar proveedor del usuario      │
│                                      │
│ 2. Si no hay API key propia          │
│    → usar claves gratuitas del sitio │
│                                      │
│ 3. Si Groq falla o agota cuota       │
│    → fallback a OpenRouter           │
│                                      │
│ 4. Si supera límites                 │
│    → mostrar aviso                   │
└──────────────────────────────────────┘
  ↓
Modelo IA
  ↓
Tools internas
  ↓
Supabase
```

Principio clave:

```text
IA → tools controladas → validación → Supabase
```

La IA nunca debe tener acceso directo a Supabase ni ejecutar SQL arbitrario.

---

## 9. Estructura recomendada en Next.js

```text
src/
  app/
    api/
      ai/
        chat/
          route.ts

  components/
    ai/
      AISidebar.tsx
      ChatMessage.tsx
      ChatInput.tsx
      AISettingsPanel.tsx

  lib/
    ai/
      runAI.ts
      types.ts
      limits.ts
      prompts.ts

      providers/
        groq.ts
        openrouter.ts

      tools/
        searchComponents.ts
        getComponent.ts
        compareComponents.ts
        addToComparison.ts
        setCustomPrice.ts
        createCombo.ts
        createBuild.ts
        findExternalPrice.ts

      web-search/
        tavily.ts
        brave.ts
        serpapi.ts

  lib/
    supabase/
      server.ts
      client.ts
```

---

## 10. Variables de entorno

```env
# IA del proyecto
GROQ_API_KEY=...
OPENROUTER_API_KEY=...

AI_DEFAULT_PROVIDER=groq
AI_DEFAULT_MODEL=llama-3.1-8b-instant

AI_FALLBACK_PROVIDER=openrouter
AI_FALLBACK_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Web search del proyecto
DEFAULT_WEB_SEARCH_PROVIDER=tavily
TAVILY_API_KEY=...
BRAVE_SEARCH_API_KEY=...
SERPAPI_API_KEY=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Límites
AI_FREE_MESSAGES_PER_DAY=30
AI_FREE_ACTIONS_PER_DAY=10
AI_FREE_WEB_SEARCHES_PER_DAY=3
AI_FREE_EXTERNAL_PRICE_UPDATES_PER_DAY=1
```

Notas:

- Las claves privadas nunca deben usar prefijo `NEXT_PUBLIC_`.
- `SUPABASE_SERVICE_ROLE_KEY` solo debe existir en servidor.
- Las API keys del proyecto solo se usan desde endpoints backend.

---

## 11. Tools internas

Las tools son funciones controladas por la aplicación.

### 11.1 Tools de lectura

Estas pueden ejecutarse con menos riesgo:

```text
search_components
get_component
compare_components
search_combos
get_combo
search_builds
get_build
get_current_page_context
```

### 11.2 Tools de escritura

Estas deben validar usuario y permisos:

```text
add_to_comparison
remove_from_comparison
set_custom_price
create_combo
create_build
update_build
```

### 11.3 Tools de precio externo

Estas deben estar muy limitadas:

```text
find_external_price
find_best_external_price
apply_external_price
apply_external_prices_to_build
```

`find_external_price` solo busca y devuelve candidatos.

`apply_external_price` modifica el precio personalizado y debería pedir confirmación si cambia datos persistentes.

---

## 12. Confirmaciones

No todas las acciones deben confirmarse.

### Acciones que pueden ejecutarse directamente

- Buscar componentes.
- Leer información.
- Comparar componentes.
- Añadir algo al comparador.
- Explicar diferencias.
- Pedir recomendaciones.

### Acciones que deberían pedir confirmación

- Cambiar precios personalizados.
- Cambiar muchos precios a la vez.
- Crear una build completa.
- Crear un combo completo.
- Aplicar precios encontrados en Internet.
- Borrar o sobrescribir datos.

Ejemplo de confirmación:

```text
He encontrado estos precios:

GPU: 689,99 € en PcComponentes
CPU: 379,99 € en Coolmod
RAM: 104,99 € en Amazon

¿Quieres aplicar estos precios personalizados?
```

---

## 13. Contexto de página

El panel lateral debe enviar información de la página actual.

Ejemplo:

```ts
{
  currentPage: "component_detail",
  componentId: "gpu_123",
  currentBuildId: null,
  selectedComparisonIds: ["gpu_123", "gpu_456"]
}
```

Así el usuario puede decir:

```text
Añade esta gráfica al comparador
```

Y la IA entiende qué significa “esta”.

---

## 14. Flujo de una petición

Ejemplo:

Usuario:

```text
Compara esta RTX 5070 Ti con la RX 9070 XT y añade la mejor al comparador.
```

Flujo:

```text
1. AISidebar envía mensaje + contexto de página.
2. /api/ai/chat valida sesión y límites.
3. AI Gateway elige proveedor:
   - API key local del usuario si existe.
   - Groq por defecto.
   - OpenRouter si procede fallback.
4. El modelo solicita tool search_components.
5. El backend busca en Supabase.
6. El modelo solicita compare_components.
7. El backend obtiene notas, precios y métricas reales.
8. El modelo decide recomendación.
9. El backend ejecuta add_to_comparison si procede.
10. El sidebar muestra respuesta y la UI se actualiza.
```

---

## 15. Persistencia de uso

Aunque las API keys personalizadas se guarden en local, el uso del Tier Free debe registrarse en servidor.

Tabla sugerida:

```text
ai_usage_daily
- user_id
- date
- messages_used
- tokens_input
- tokens_output
- web_searches_used
- actions_used
- external_price_updates_used
- created_at
- updated_at
```

También se puede guardar un log de acciones para depuración:

```text
ai_action_logs
- id
- user_id
- action_name
- payload_summary
- result_summary
- provider
- model
- created_at
```

No guardar API keys en logs.

---

## 16. Mensajes de error y UX

### Sin créditos

```text
Has agotado tus créditos gratuitos de IA de hoy.

Opciones:
1. Esperar a mañana.
2. Añadir tu propia API key de Groq/OpenRouter.
3. Usar la web sin IA.
```

### Búsqueda web agotada

```text
Has agotado tus búsquedas web gratuitas de hoy.

Puedes seguir usando la IA con los datos internos de la web o añadir tu propia API key de búsqueda.
```

### API key inválida

```text
La API key configurada no parece válida. Revisa el proveedor seleccionado y vuelve a intentarlo.
```

### Rate limit del proveedor

```text
El proveedor de IA ha devuelto un límite de uso. Intentaré usar el proveedor alternativo si está configurado.
```

---

## 17. Riesgos principales

### 17.1 Abuso del free tier

Medidas:

- Límite por usuario.
- Límite por IP.
- Email verificado para usar IA.
- Rate limiting en `/api/ai/chat`.
- Límites separados para web search.
- Logs de uso.

### 17.2 Prompts maliciosos

Medidas:

- El modelo no toca Supabase directamente.
- Todas las tools validan permisos.
- No aceptar SQL generado por la IA.
- No ejecutar acciones fuera de la lista de tools.
- Confirmar acciones sensibles.

### 17.3 Web search incorrecto

Medidas:

- Usar tools específicas.
- Restringir dominios cuando sea posible.
- Devolver URL, tienda, precio, stock y confianza.
- No aplicar precios automáticamente sin confirmación.
- Evitar resultados de marketplace, reacondicionados o productos distintos.

### 17.4 API keys de usuario

Medidas en MVP:

- Guardar en local.
- Avisar al usuario de que la key está en su navegador.
- No enviarla a terceros salvo al proveedor seleccionado.
- No registrarla en logs.
- No devolverla desde backend.

Medidas futuras:

- Cifrado en servidor.
- Rotación de claves.
- Eliminación desde ajustes.
- Historial de último uso sin exponer la key.

---

## 18. Orden de implementación recomendado

### Fase 1: IA básica sin web search

- Crear `AISidebar`.
- Crear `/api/ai/chat`.
- Integrar Groq.
- Crear abstracción `runAI`.
- Implementar `search_components`.
- Implementar `get_component`.
- Implementar `compare_components`.
- Implementar `add_to_comparison`.
- Implementar límites básicos del Tier Free.

### Fase 2: OpenRouter y fallback

- Añadir proveedor OpenRouter.
- Añadir configuración `AI_FALLBACK_PROVIDER`.
- Detectar errores de cuota/rate limit.
- Permitir cambiar proveedor desde código.
- Registrar proveedor y modelo usado.

### Fase 3: API keys locales del usuario

- Crear `AISettingsPanel`.
- Guardar API key IA en local.
- Permitir elegir Groq u OpenRouter.
- Enviar la key al backend solo durante la petición.
- Validar key con una llamada sencilla.
- Mostrar errores claros.

### Fase 4: Web search controlado

- Añadir proveedor Tavily o similar.
- Crear `find_external_price`.
- Limitar búsquedas por usuario.
- Mostrar candidatos con fuente.
- Pedir confirmación antes de aplicar precio.

### Fase 5: API key local para web search

- Añadir selector de proveedor web search.
- Guardar API key de búsqueda en local.
- Usar key propia si existe.
- Mantener límites internos de seguridad.
- Manejar errores de cuota o key inválida.

### Fase 6: Builds y combos avanzados

- Crear `create_combo`.
- Crear `create_build`.
- Añadir validaciones de compatibilidad.
- Integrar puntuaciones ya existentes.
- Pedir confirmación antes de guardar.

---

## 19. Decisiones pendientes

- Elegir proveedor inicial de web search.
- Decidir si la API key local se guarda en `localStorage` o `sessionStorage`.
- Decidir si las acciones de precio personalizado requieren siempre confirmación.
- Definir modelos exactos de Groq y OpenRouter.
- Definir formato final del sistema de créditos.
- Decidir si se guardará historial de conversaciones desde la primera versión.
- Decidir si usuarios no registrados pueden usar IA.
- Definir límite por IP para evitar abuso.

---

## 20. Resumen técnico

La arquitectura final debe permitir esto:

```text
Groq/OpenRouter = cerebro que interpreta el mensaje
Tools internas = acciones reales sobre la web
Web search API = búsqueda externa de precios
Supabase = fuente de datos real
AI Gateway = capa que decide proveedor, límites y permisos
```

La regla principal:

```text
La IA nunca modifica datos directamente.
La IA solicita una tool.
La tool valida.
El backend ejecuta.
Supabase guarda.
La UI se actualiza.
```

Esta separación permite cambiar de proveedor, limitar costes y mantener control sobre builds, combos, comparativas y precios personalizados.
