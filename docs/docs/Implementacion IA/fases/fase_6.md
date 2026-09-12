# Fase 6 — Búsqueda externa de precios con Tavily (retirada)

> Estado: retirada. Se conserva como referencia histórica; la aplicación ya no expone búsqueda externa de precios ni configuración BYOK de Tavily/Brave.

## Alcance actual

CoreX AI puede buscar referencias actuales de un componente en cuatro fuentes permitidas:

- PcComponentes (`pccomponentes.com`)
- Amazon (`amazon.es`)
- eBay (`ebay.es`)
- AliExpress (`aliexpress.com` y `es.aliexpress.com`)

La búsqueda se realiza exclusivamente mediante la tool `find_external_price`. No se modifican precios, combos, builds ni la bóveda. No se guarda historial persistente de conversaciones.

Cuando el parser determinista no encuentra un importe en una ficha válida, se
puede activar un segundo paso local con Qwen. El modelo solo interpreta el
contenido ya recibido por Tavily; no navega, no elige URLs y la evidencia debe
aparecer literalmente en la fuente. La función está desactivada por defecto.

## Flujo

```text
Usuario pide un precio actual
  ↓
Gateway expone únicamente find_external_price
  ↓
Backend consulta Tavily con dominios permitidos
  ↓
Se validan producto, variante, moneda, precio y disponibilidad
  ↓
Se muestran candidatos, URL y confianza
```

## Validaciones

- Solo se aceptan URLs de la allowlist del servidor.
- Se descartan reacondicionados, usados, repuestos y resultados sin coincidencia suficiente.
- Se intenta priorizar el precio en EUR para búsquedas en España.
- Cuando no hay EUR, se conserva la moneda original y se muestra una equivalencia aproximada configurable.
- Se detectan variantes como 5600X, 5600G o RTX 5060 Ti cuando la consulta pide el modelo base.
- Amazon, eBay y AliExpress muestran una advertencia porque pueden incluir vendedores externos.
- Las búsquedas generales se separan por tienda para no depender del ranking de una única consulta Tavily.
- Se descartan importes promocionales, cupones, descuentos y gastos de envío; también se eliminan candidatos sin precio.
- La respuesta no se convierte automáticamente en un precio personalizado.

## Configuración local

```env
TAVILY_API_KEY=...
WEB_SEARCH_PROVIDER=tavily
WEB_SEARCH_DEFAULT_COUNTRY=ES
WEB_SEARCH_MAX_RESULTS=5
WEB_SEARCH_DEFAULT_DEPTH=basic
WEB_SEARCH_INCLUDE_RAW_CONTENT=true
WEB_SEARCH_USD_TO_EUR=0.92
WEB_SEARCH_GBP_TO_EUR=1.17
WEB_SEARCH_BRL_TO_EUR=0.16
# Opcional: fallback LLM local, una llamada por búsqueda y hasta tres fichas.
WEB_SEARCH_PRICE_LLM_ENABLED=false
WEB_SEARCH_PRICE_LLM_MODEL=Qwen3.5-9B-UD-Q4_K_XL
# Opcional durante la evaluación: analiza, registra y no publica el precio.
WEB_SEARCH_PRICE_LLM_SHADOW=false
```

El fallback reutiliza `AI_LOCAL_BASE_URL` y `AI_LOCAL_MODEL`. Mantén esa URL
en loopback; si el servidor local no está disponible, la búsqueda continúa de
forma segura con el resultado determinista.

La clave solo se consume en el backend y no se incluye en la respuesta del asistente.

Cuando una fuente no publica EUR, se conserva la moneda detectada y se muestra una equivalencia aproximada configurable. Esa equivalencia es informativa y no modifica ningún precio.

Aplicar también `supabase/migrations/20260823150000_ai_web_search_quota.sql`. La búsqueda Tavily tiene una cuota diaria independiente de la cuota de mensajes y tokens de CoreX AI.

## Archivos principales

- `src/lib/ai/web-search/tavily-client.ts`: cliente HTTP de Tavily.
- `src/lib/ai/web-search/trusted-domains.ts`: allowlist de tiendas.
- `src/lib/ai/web-search/price-parser.ts`: extracción de precios y monedas.
- `src/lib/ai/web-search/llm-price-extractor.ts`: fallback LLM local con JSON y evidencia verificable.
- `src/lib/ai/web-search/validate-price-candidate.ts`: validación y confianza.
- `src/lib/ai/actions.ts`: tool `find_external_price` y respuesta estructurada.
- `src/lib/ai/gateway.ts`: routing exclusivo y límite de rondas.
- `src/ui/ai/ExternalPriceResultsCard.tsx`: resultados con enlaces externos.

## Fuera de esta fase

- Aplicar precios encontrados a `PriceCustomCard.tsx`.
- Insertar precios al crear combos o builds.
- Actualizar precios personalizados mediante IA.
- Búsquedas masivas de todos los componentes de una build.
- API keys de Tavily introducidas por usuarios.
- Historial persistente de chats.
