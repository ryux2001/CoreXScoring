---
target: src/app/(main)/combos/[slug]/components/FpsCard.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-13T16-45-52Z
slug: src-app-main-combos-slug-components-fpscard-tsx
---
# Crítica de diseño: FpsCard.tsx

## Design Health Score

| # | Heurística | Puntuación | Hallazgo clave |
|---|---|---:|---|
| 1 | Visibilidad del estado del sistema | 2/4 | Los FPS se recalculan, pero no hay estado visible para carga, datos ausentes o resultado no disponible. |
| 2 | Correspondencia con el mundo real | 3/4 | FPS, 1080p, 1440p y 4K son familiares para el público gamer; “Gráficos” es algo ambiguo sin contexto. |
| 3 | Control y libertad del usuario | 3/4 | Los dos selectores permiten cambiar rápidamente el escenario, pero no hay una salida clara del tooltip ni reset explícito. |
| 4 | Consistencia y estándares | 3/4 | El lenguaje visual zinc/negro y las superficies redondeadas encajan con las tarjetas vecinas. |
| 5 | Prevención de errores | 2/4 | La selección de preset se reajusta, pero datos inexistentes o incompatibles terminan representados como 0 FPS. |
| 6 | Reconocimiento frente a recuerdo | 2/4 | El contexto seleccionado está visible, pero falta un título y falta explicar de forma persistente qué significan las cifras. |
| 7 | Flexibilidad y eficiencia | 2/4 | Los controles nativos son rápidos, pero no hay atajos ni una ruta eficiente para comparar escenarios. |
| 8 | Diseño estético y minimalista | 3/4 | La tarjeta es limpia y enfocada, aunque el espacio vertical y tres cajas con igual peso diluyen la jerarquía. |
| 9 | Reconocer, diagnosticar y recuperarse de errores | 1/4 | Un 0 puede significar rendimiento real o falta de datos; no se ofrece diagnóstico ni recuperación. |
| 10 | Ayuda y documentación | 1/4 | La única explicación está en un tooltip hover no accesible como control y en una nota de 8 px. |
| **Total** |  | **22/40** | **Aceptable: necesita mejoras significativas antes de sentirse sólida.** |

## Veredicto de especificidad

La función sí es específica del producto: permite proyectar FPS por juego, preset y resolución dentro de un combo de hardware. La composición visual, sin embargo, es intercambiable con cualquier dashboard gamer oscuro: tarjeta negra, dos selects, tres métricas y un icono de información. Falta una señal más propia de CoreX Scoring, por ejemplo una etiqueta “FPS estimados”, una lectura de confianza/metodología o una jerarquía que conecte claramente combo → juego → preset → resultado.

El detector determinista no reportó hallazgos (`[]`) en `src/app/(main)/combos/[slug]/components/FpsCard.tsx`; no hubo falsos positivos que descartar. La revisión visual en navegador no pudo ejecutarse porque no hay herramienta de navegador expuesta en esta sesión.

## Impresión general

La tarjeta es compacta, coherente con el tema oscuro y tiene un flujo mental razonable: elegir juego, elegir calidad y leer tres resultados. Su mayor debilidad es que comunica valores con mucha seguridad aunque el cálculo puede devolver ceros por falta de datos, y que la explicación de la métrica está escondida en una interacción solo de hover.

## Lo que funciona

- La relación entre controles y resultados es directa: el usuario cambia el escenario y las tres resoluciones se actualizan en el mismo contexto.
- Las tres salidas están agrupadas y comparables; 1080p, 1440p y 4K comparten estructura y reducen el esfuerzo de lectura.
- La superficie reutiliza el lenguaje de `ComboMainCard` y del resto de la vista: bordes sutiles, radios grandes, fondo casi negro y tipografía de alto peso.

## Problemas prioritarios

### [P1] Los estados inválidos o vacíos se disfrazan de “0 FPS”

**Por qué importa:** sin juegos, sin GPU compatible, sin preset o sin datos para una resolución, `calculateComboFps` devuelve ceros. El usuario no puede distinguir “el combo rinde 0” de “no hay datos para calcularlo”. Es un problema de confianza y puede llevar a decisiones equivocadas.

**Arreglo:** representar el estado explícitamente: `Cargando…`, `Sin datos para este juego`, `GPU no compatible` o `No disponible`; deshabilitar el selector de preset cuando no haya presets válidos; mantener el valor calculado separado del estado de disponibilidad.

**Suggested command:** `$impeccable harden` / `$impeccable audit`

### [P1] El selector de calidad puede prometer presets que no pertenecen a la GPU del combo

**Por qué importa:** `getAvailablePresets(activeGame)` obtiene los presets de la primera GPU registrada del juego, mientras `calculateComboFps` calcula con `combo.gpu.id`. Si las GPUs tienen conjuntos distintos, el control ofrece una opción aparentemente válida que puede devolver 0. La UI y el dato dejan de estar alineados.

**Arreglo:** derivar los presets desde la GPU seleccionada del combo, o intersectar los presets disponibles entre la GPU concreta y las tres resoluciones; si no hay intersección, mostrar una causa clara en lugar de un valor numérico.

**Suggested command:** `$impeccable harden`

### [P1] El tooltip de información es solo hover y no es accesible

**Por qué importa:** el disparador es un `div` de 20×20 px, no recibe foco de teclado, no tiene nombre accesible y su contenido desaparece en touch. La explicación de la metodología queda fuera para Sam (teclado/screen reader) y Casey (móvil).

**Arreglo:** usar un `button` con `aria-label`, `aria-expanded` y `aria-describedby`; abrir por foco y click/tap, cerrar con Escape y colocar la explicación en un panel que no dependa de `group-hover`. Si el texto es esencial, mostrar una línea resumida junto al título.

**Suggested command:** `$impeccable audit` / `$impeccable clarify`

### [P2] Falta una jerarquía semántica y visual para la tarjeta

**Por qué importa:** el componente empieza con “Juego” y “Gráficos”, pero no tiene un `h2` que diga qué se está leyendo. En una página con varias tarjetas, el usuario que aterriza directamente en ella debe inferir que las cajas son una estimación de FPS del combo actual.

**Arreglo:** añadir un encabezado visible como “FPS estimados”, una línea secundaria “por juego, preset y resolución” y un estado activo claro para el escenario seleccionado. Convertir “FPS 1080p” en una etiqueta de resolución y reservar “FPS” para el título/unidad, evitando repetir la misma información.

**Suggested command:** `$impeccable clarify` / `$impeccable layout`

### [P2] Tipografía demasiado pequeña y controles poco cómodos en móvil

**Por qué importa:** etiquetas de 8–10 px, nota de 8 px, selects con `py-1.5` y el icono de 20×20 px reducen legibilidad y superficie táctil. En anchos estrechos, el header puede envolver controles y dejar el tooltip flotando fuera de contexto.

**Arreglo:** elevar el texto auxiliar a al menos 11–12 px, reservar 44 px de alto para selects/botones, apilar los controles en móvil y convertir la explicación en disclosure/tap. Mantener la nota como texto normal legible y no todo en uppercase.

**Suggested command:** `$impeccable adapt` / `$impeccable typeset`

## Carga cognitiva

**Resultado: moderada, 2 fallos de 8.**

- ✅ Enfoque único: elegir un escenario y leer el resultado.
- ✅ Agrupación: controles arriba, resultados en tres cajas y nota abajo.
- ✅ Agrupación semántica: cada resolución mantiene etiqueta, número y unidad.
- ⚠️ Jerarquía visual: no hay título ni un resultado primario; todo pesa casi igual.
- ✅ Una cosa cada vez: no obliga a cambiar de pantalla para comparar.
- ✅ Decisiones mínimas: dos controles principales.
- ✅ Memoria de trabajo: juego y preset siguen visibles al leer los resultados.
- ⚠️ Revelación progresiva: la metodología queda escondida detrás de hover y no está disponible en todos los dispositivos.

## Recorrido emocional

El inicio transmite control porque los selectores están cerca del resultado. El momento de decisión pierde fuerza porque “Gráficos” no define si es calidad visual, preset o modo de renderizado. El final tampoco ofrece una lectura tranquilizadora: un número aparece como definitivo aunque sea una estimación y un 0 puede ser un fallo de datos. La tarjeta necesita hacer visible la incertidumbre calculada sin volverla alarmista.

## Banderas por persona

### Jordan, primera vez

- No encuentra un título que diga qué significan las tres cifras.
- “Gráficos”, “FPS” y “nativo” presuponen vocabulario técnico.
- El tooltip que debería aclararlo solo aparece al pasar el ratón; en móvil no hay ayuda equivalente.
- Un 0 no comunica si debe cambiar el juego, el preset o esperar datos.

### Sam, usuario con dependencia de accesibilidad

- El icono de información es un `div` no enfocable, sin nombre accesible y con estado solo visual.
- Los textos de 8–10 px y el zinc tenue dificultan la lectura con baja visión y zoom.
- No hay encabezado claro que estructure la región ni anuncio específico para cambios de resultado.
- La información importante se transmite por hover y no por un patrón accesible de disclosure.

### Casey, usuario móvil distraído

- Los controles están arriba y pueden envolver de manera poco predecible en una tarjeta estrecha.
- Selects e icono son pequeños para uso con pulgar.
- El tooltip no existe como interacción táctil estable.
- Si los datos no están disponibles, los ceros no ofrecen una siguiente acción clara.

## Observaciones menores

- `combo?: any` debilita el contrato del componente y dificulta comunicar estados de datos incompletos.
- El estado inicial de `selectedGameId` solo se calcula al montar; si `games` llega o cambia después, el selector puede quedar sin una opción seleccionada coherente.
- La repetición de “FPS” en `FPS 1080p` y en la unidad añade ruido; “1080p” como etiqueta sería más limpio.
- Los comentarios y textos muestran mojibake (`EstimaciÃ³n`, `CÃ¡lculo`, `GrÃ¡ficos`), lo que degrada la percepción de calidad si llega al usuario.

## Preguntas para desbloquear una mejora

- ¿Qué debe priorizar la tarjeta: comparar rápidamente tres resoluciones o explicar con confianza cómo se estima el número?
- ¿Qué debería ver el usuario cuando no existe un dato: “No disponible”, una estimación conservadora o una acción para corregir el escenario?
- ¿Puede CoreX Scoring mostrar una lectura propia —por ejemplo, “limitado por GPU/CPU”— en lugar de tres números genéricos?
