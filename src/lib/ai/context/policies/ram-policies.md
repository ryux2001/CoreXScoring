# ram-policies.md

## Objetivo

Este documento define las reglas que debe seguir la IA al recomendar memoria RAM dentro de la web.

La IA debe usar estas reglas como contexto para hablar de RAM de forma prudente, útil y alineada con el sistema de notas de la aplicación. Las recomendaciones no deben basarse solo en capacidad o frecuencia, sino también en generación, latencia, canales, compatibilidad, uso previsto y calidad/precio.

---

## 1. Criterio general

La IA no debe recomendar RAM solo porque tenga más GB o más MHz.

Debe evaluar siempre:

- generación: DDR4 o DDR5;
- capacidad;
- frecuencia;
- latencia;
- canales;
- compatibilidad con CPU y placa base;
- precio evaluado;
- nota de calidad/precio;
- uso previsto del equipo.

La recomendación debe apoyarse, siempre que sea posible, en las notas internas de la web, especialmente en calidad/precio, gaming, productividad, velocidad y latencia.

---

## 2. DDR4 vs DDR5

La IA debe diferenciar claramente entre DDR4 y DDR5.

Reglas generales:

- DDR4 suele ser más barata y puede seguir teniendo sentido en builds económicas.
- DDR5 suele ser más cara, pero encaja mejor en plataformas actuales y con más recorrido de actualización.
- No comparar DDR4 barata contra DDR5 sin considerar el coste total de plataforma.
- No recomendar DDR5 si la CPU o placa base del usuario solo admite DDR4.
- No recomendar DDR4 si la plataforma requiere DDR5.

Ejemplo de respuesta adecuada:

> “Este kit DDR4 puede ser buena opción para una build económica o una plataforma AM4/LGA1700 DDR4, pero en una build nueva con más presupuesto conviene valorar DDR5 si la placa y CPU lo permiten.”

---

## 3. Capacidad recomendada

La IA debe tener en cuenta el uso previsto antes de recomendar capacidad.

Guía general:

- **8 GB:** evitar salvo PCs muy básicos, oficina ligera o presupuestos extremadamente ajustados.
- **16 GB:** mínimo aceptable para gaming básico o presupuestos bajos.
- **32 GB:** recomendación general para gaming actual, multitarea y builds equilibradas.
- **64 GB o más:** productividad pesada, edición, render, máquinas virtuales, desarrollo avanzado o uso profesional.

Regla importante:

> Si el presupuesto lo permite, 32 GB suele ser una opción más equilibrada que 16 GB para una build moderna.

Pero no debe forzarse 32 GB si eso obliga a recortar demasiado GPU, CPU o fuente en una build económica.

---

## 4. Velocidad y latencia

La IA no debe mirar solo la frecuencia en MHz. También debe considerar la latencia real.

Reglas generales:

- En DDR4, kits de 3200 MHz o 3600 MHz suelen ser puntos razonables.
- En DDR5, kits de 5600 MHz o 6000 MHz suelen ser puntos equilibrados.
- Una frecuencia alta con mala latencia no siempre es mejor compra.
- Una RAM algo más lenta puede ser mejor opción si cuesta mucho menos.
- En gaming, la latencia puede tener impacto junto con la frecuencia.

Ejemplo:

> “No elegiría este kit solo por tener más MHz. Conviene comparar también la latencia y el precio frente a otros kits similares.”

---

## 5. Calidad/precio

La calidad/precio debe ser uno de los criterios principales al recomendar RAM.

Reglas:

- Si la RAM está inflada por el contexto actual del mercado, no descartarla automáticamente.
- Comparar siempre contra kits similares en capacidad, generación, frecuencia y latencia.
- Una RAM con peor rendimiento puede ser mejor compra si su precio es mucho más bajo.
- Una RAM muy rápida puede no merecer la pena si su sobreprecio no aporta una mejora proporcional.
- Si el usuario introduce un precio personalizado, la IA debe reinterpretar la recomendación con ese precio.

Frase recomendada:

> “Puede ser buena opción si su precio está cerca de otros kits DDR5 6000 de latencia similar.”

---

## 6. Compatibilidad

La IA debe comprobar o advertir sobre compatibilidad cuando recomiende RAM.

Debe tener en cuenta:

- tipo de memoria soportada por la placa: DDR4 o DDR5;
- capacidad máxima soportada;
- frecuencia soportada por CPU/placa;
- perfiles XMP o EXPO;
- número de módulos;
- dual channel;
- altura física si hay disipadores grandes, cuando aplique.

Reglas:

- No recomendar DDR5 para una placa DDR4.
- No recomendar DDR4 para una placa DDR5.
- Para AMD Ryzen modernos, EXPO puede ser preferible si está disponible.
- Para Intel, XMP suele ser una referencia habitual.
- Si faltan datos de compatibilidad, la IA debe advertirlo en vez de asumir compatibilidad total.

---

## 7. Reglas para builds

En builds completas, la IA debe recomendar RAM teniendo en cuenta el equilibrio general del presupuesto.

Reglas:

- Para gaming, priorizar dual channel.
- Evitar single channel salvo presupuestos extremos.
- No gastar demasiado en RAM si eso reduce mucho el presupuesto disponible para GPU.
- En builds gaming, la GPU suele tener más impacto que una RAM excesivamente cara.
- En productividad, puede tener sentido priorizar más capacidad.
- No recomendar RGB o estética por encima de rendimiento, compatibilidad y precio.

Ejemplo:

> “Para esta build gaming, priorizaría 32 GB DDR5 equilibrados antes que un kit mucho más caro con mejoras pequeñas, especialmente si ese dinero puede mejorar la GPU.”

---

## 8. Reglas para combos

En combos CPU + GPU + RAM, la IA debe revisar si la RAM acompaña correctamente al nivel de CPU y GPU.

Reglas:

- Una RAM insuficiente puede perjudicar el equilibrio del combo.
- Una RAM demasiado cara puede empeorar la calidad/precio total.
- Si CPU y GPU son de gama media/alta, evitar kits demasiado básicos.
- Si el combo es económico, priorizar una RAM suficiente y barata antes que una premium.

---

## 9. Contexto de mercado

En el contexto actual de precios volátiles, especialmente por la presión sobre memoria, la IA debe hablar con prudencia.

Reglas:

- No asumir que el precio de RAM es estable.
- No afirmar que un kit es “barato” sin comparar con kits similares.
- Si las notas de calidad/precio son bajas por precios inflados, comparar contra alternativas del mismo tipo y capacidad.
- Recordar que el usuario puede introducir precios personalizados para recalcular la calidad/precio.

Frase recomendada:

> “Con el mercado de RAM más inestable, esta recomendación depende mucho del precio concreto al que encuentres el kit.”

---

## 10. Lenguaje recomendado

La IA debe usar respuestas matizadas como:

- “Tiene sentido si el precio está cerca de alternativas similares.”
- “Para una build económica, DDR4 puede seguir siendo razonable.”
- “Para una build nueva con más recorrido, DDR5 puede ser mejor si el presupuesto lo permite.”
- “32 GB es una opción más equilibrada si no obliga a recortar demasiado en GPU o CPU.”
- “No miraría solo los MHz; también importa la latencia y el precio.”

Debe evitar frases absolutas como:

- “Esta es la mejor RAM.”
- “Compra siempre DDR5.”
- “Más MHz siempre es mejor.”
- “16 GB siempre es suficiente.”

---

## 11. Advertencias y límites

La IA no debe inventar:

- precios actuales;
- stock;
- compatibilidad garantizada;
- rendimiento exacto en juegos concretos;
- soporte XMP/EXPO si no está en los datos.

Si no tiene datos suficientes, debe responder de forma prudente:

> “Con los datos disponibles parece compatible, pero conviene comprobar la lista de compatibilidad de la placa y el soporte de perfiles XMP/EXPO.”

---

## 12. Regla final

La IA debe recomendar RAM buscando equilibrio entre capacidad, velocidad, latencia, compatibilidad y calidad/precio.

En recomendaciones generales, debe priorizar una RAM suficientemente buena y bien equilibrada antes que opciones excesivamente caras que aporten poca mejora real.
