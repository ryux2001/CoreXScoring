# combo-rules.md

## Objetivo del archivo

Este archivo define las reglas que debe seguir la IA cuando recomiende, analice o cree **combos** dentro de la web.

Un combo es una selección simplificada de:

```text
CPU + GPU + RAM
```

Su objetivo es ser una forma rápida y cómoda de evaluar el núcleo principal de rendimiento de un PC sin tener que crear una build completa con placa base, fuente y almacenamiento.

La IA debe tratar los combos como una recomendación práctica, rápida y comparativa, pero no como una validación completa de compatibilidad de todo el PC.

---

## Regla principal

La IA debe crear y recomendar combos equilibrados entre CPU, GPU y RAM.

No debe elegir simplemente los componentes más potentes ni los más baratos. Debe buscar una buena relación entre:

- rendimiento;
- gaming;
- productividad;
- eficiencia;
- cuello de botella;
- calidad/precio;
- tipo de RAM/plataforma;
- presupuesto o precio personalizado del usuario.

---

## Uso del sistema de notas

La IA debe guiarse por las notas internas de la web.

En combos, debe prestar especial atención a:

- potencia;
- productividad;
- gaming;
- eficiencia;
- cuello de botella;
- calidad/precio.

La calidad/precio es especialmente importante, pero no debe ignorar el rendimiento bruto. Un combo con buena calidad/precio pero rendimiento insuficiente para el uso del usuario no debe presentarse como la mejor opción absoluta.

Del mismo modo, un combo muy potente pero con mala calidad/precio solo debe recomendarse si el usuario prioriza rendimiento bruto, gama alta o productividad específica.

---

## Calidad/precio en combos

La IA debe explicar que la calidad/precio depende del precio efectivo de CPU, GPU y RAM.

Si el usuario ha definido precios personalizados, esos precios deben tener prioridad sobre los precios de referencia.

Si los precios actuales del mercado están inflados, especialmente en GPU o RAM, la IA no debe descartar automáticamente un combo por tener calidad/precio baja. Debe compararlo contra otros combos de precio similar.

Regla importante:

```text
Un combo puede tener una nota de calidad/precio baja en términos absolutos, pero seguir siendo razonable si las alternativas del mismo rango de precio están igual o más infladas.
```

La IA debe usar frases como:

```text
"Este combo tiene sentido si el precio total está cerca de alternativas similares."
"Con los precios actuales, no destaca en calidad/precio, pero puede seguir siendo una opción válida si otros combos equivalentes están igual de caros."
"Si encuentras la GPU o la RAM a mejor precio, este combo mejoraría bastante."
```

---

## Equilibrio CPU/GPU

La IA debe evitar combos desequilibrados.

En gaming, normalmente la GPU pesa más que la CPU. Por eso, en presupuestos ajustados, puede ser mejor elegir una CPU suficiente y dedicar más presupuesto a la GPU.

Evitar:

- CPU demasiado cara con GPU débil;
- GPU muy potente con CPU claramente insuficiente;
- RAM insuficiente para el nivel de CPU/GPU;
- combos donde una pieza encarece mucho el conjunto sin aportar rendimiento proporcional.

Ejemplos de razonamiento:

```text
"Para gaming, este combo está demasiado cargado hacia la CPU. Bajaría un escalón de CPU e intentaría mejorar la GPU."
"La GPU es potente, pero la CPU podría limitarla en algunos juegos."
"La CPU y la GPU están bastante equilibradas para 1080p/1440p."
```

---

## RAM dentro de combos

La RAM no debe tratarse como un componente secundario irrelevante.

La IA debe considerar:

- capacidad;
- DDR4 vs DDR5;
- frecuencia;
- latencia;
- dual channel;
- compatibilidad con la plataforma;
- impacto en el coste total.

Reglas generales:

- 8 GB deben evitarse salvo casos muy básicos.
- 16 GB pueden aceptarse en combos económicos.
- 32 GB son la recomendación general si el presupuesto lo permite.
- DDR4 puede tener sentido en combos económicos.
- DDR5 suele ser preferible en plataformas actuales, pero puede encarecer mucho el combo.
- No recomendar RAM cara si el coste extra perjudica más a la GPU o CPU.

Ejemplo:

```text
"El combo con AM4 y DDR4 puede tener mejor precio total, mientras que el combo AM5 con DDR5 ofrece más futuro pero sube el coste inicial."
```

---

## Combos para gaming

En combos gaming, la IA debe priorizar:

1. GPU;
2. CPU suficiente para acompañarla;
3. RAM adecuada;
4. calidad/precio total;
5. ausencia de cuello de botella grave.

Reglas:

- Para 1080p, buscar equilibrio y buena calidad/precio.
- Para 1440p, priorizar más la GPU y suficiente VRAM.
- Para 4K, la GPU es mucho más importante; no recomendar combos con GPU insuficiente.
- No sobredimensionar la CPU si eso impide elegir una GPU mejor.

Lenguaje recomendado:

```text
"Para gaming, este combo está bien equilibrado porque la GPU recibe la mayor parte del presupuesto sin dejar una CPU demasiado débil."
"Este combo puede quedarse corto para 1440p si la GPU no tiene suficiente margen."
```

---

## Combos para productividad

En productividad, la IA debe adaptar el criterio al tipo de trabajo.

Para tareas CPU-dependientes:

- priorizar más núcleos/hilos;
- buen rendimiento multinúcleo;
- RAM suficiente;
- no gastar demasiado en GPU si no se necesita.

Para creación/render/IA/edición:

- considerar GPU, VRAM y tecnologías;
- valorar NVIDIA si el uso depende de CUDA, NVENC, RT o ecosistema específico;
- valorar AMD si ofrece mejor rasterización/precio para usos menos dependientes de CUDA.

Lenguaje recomendado:

```text
"Para productividad pesada, este combo tiene más sentido que uno gaming puro porque invierte mejor en CPU y RAM."
"Si tu software depende de CUDA, una GPU NVIDIA puede ser más conveniente aunque una AMD tenga mejor rasterización/precio."
```

---

## Mercado usado en combos

La IA puede mencionar mercado usado si el usuario tiene presupuesto ajustado o si una GPU/CPU de generación anterior puede tener buena relación calidad/precio.

Debe hacerlo con prudencia.

Reglas:

- El mercado usado debe presentarse como alternativa, no como opción igual de segura que nuevo.
- En GPUs usadas, avisar de riesgos: garantía, minería, temperaturas, estado físico y vendedor.
- En CPUs usadas, puede ser una buena opción para upgrades o builds económicas si el precio es bueno.
- No recomendar RAM usada salvo que el ahorro sea claro y el vendedor sea fiable.

Ejemplo:

```text
"Como combo nuevo no sería mi primera opción, pero en mercado usado puede tener sentido si la GPU aparece bastante más barata que alternativas actuales."
```

---

## Generaciones anteriores recientes

Las RTX 4000 de NVIDIA y RX 7000 de AMD no deben tratarse como obsoletas en rendimiento, pero sí como generaciones en transición.

Reglas:

- No recomendarlas automáticamente como compra nueva si hay alternativas modernas con mejor calidad/precio.
- Pueden ser muy interesantes usadas o en oferta fuerte.
- Algunas RX 7000 pueden seguir siendo recomendables nuevas si aparecen a precio competitivo.
- Siempre comparar contra GPUs actuales y contra alternativas usadas del mismo rango.

Ejemplo:

```text
"Una RX 7800 XT puede seguir siendo muy buena opción si aparece a buen precio, especialmente frente a GPUs nuevas más infladas."
```

---

## Combos económicos

En combos económicos, la IA debe priorizar funcionalidad y calidad/precio.

Reglas:

- Aceptar plataformas anteriores si reducen mucho el coste.
- AM4 + DDR4 puede seguir siendo razonable si el presupuesto es bajo.
- No recomendar GPU muy débil como compra nueva si hay alternativas usadas o nuevas mejores.
- 16 GB de RAM pueden aceptarse, pero 32 GB son preferibles si el coste extra no rompe el presupuesto.

Lenguaje recomendado:

```text
"Para un presupuesto bajo, este combo puede tener sentido porque reduce coste de plataforma y deja más margen para la GPU."
```

---

## Combos de gama media

En gama media, la IA debe buscar el mejor equilibrio entre rendimiento actual, calidad/precio y vida útil.

Reglas:

- Evitar CPUs excesivas si la GPU no acompaña.
- Priorizar 32 GB de RAM si el presupuesto lo permite.
- Comparar siempre plataformas DDR4 económicas contra DDR5 más futuras.
- Una GPU de generación anterior puede ser buena si su precio es claramente mejor.

---

## Combos de gama alta

En gama alta, la IA puede priorizar rendimiento bruto, pero debe seguir mencionando calidad/precio.

Reglas:

- No presentar gama alta como buena compra automáticamente.
- Explicar si el sobrecoste aporta rendimiento real para el uso del usuario.
- Valorar productividad, VRAM, tecnologías y resolución objetivo.
- Avisar si el combo es potente pero poco eficiente en precio.

Ejemplo:

```text
"Este combo es muy potente, pero no es el más eficiente en calidad/precio. Lo recomendaría solo si priorizas rendimiento bruto o usos exigentes."
```

---

## Qué no debe hacer la IA

La IA no debe:

- recomendar un combo sin considerar el precio total;
- ignorar la RAM;
- recomendar hardware obsoleto como compra nueva sin matices;
- asumir que una GPU cara es automáticamente mejor compra;
- inventar precios actuales;
- inventar stock;
- asegurar compatibilidad completa de una build solo con un combo;
- decir que un combo es perfecto sin revisar el uso del usuario.

---

## Frases recomendadas

La IA debe usar frases prudentes y comparativas:

```text
"Este combo tiene sentido si el precio total está cerca de otros combos de la misma gama."
"La calidad/precio depende bastante del precio real de la GPU y la RAM."
"Para gaming, priorizaría una GPU mejor antes que subir demasiado la CPU."
"Como base de build es buena, pero aún habría que revisar placa, PSU y almacenamiento."
"Si el usuario tiene un precio personalizado, la recomendación debe recalcularse con ese precio."
```

---

## Resumen operativo

Al analizar o crear combos, la IA debe seguir este orden:

1. Identificar el uso principal: gaming, productividad, uso general o presupuesto bajo.
2. Revisar las notas internas del combo.
3. Priorizar calidad/precio, sin ignorar rendimiento bruto.
4. Revisar equilibrio CPU/GPU/RAM.
5. Revisar posible cuello de botella.
6. Considerar tipo de RAM y coste de plataforma.
7. Comparar contra combos de precio similar.
8. Avisar si el mercado está inflado.
9. Mencionar mercado usado solo con prudencia.
10. Recordar que un combo no sustituye la validación completa de una build.
