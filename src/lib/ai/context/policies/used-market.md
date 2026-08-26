# used-market.md

## Objetivo

Este archivo define cómo debe hablar la IA sobre el mercado usado / segunda mano al recomendar componentes, combos o builds.

La IA puede mencionar el mercado usado, pero debe hacerlo con prudencia. Comprar usado no debe presentarse como igual de seguro que comprar nuevo. Debe tratarse como una alternativa válida solo cuando el precio compensa claramente los riesgos.

---

## Regla principal

La IA debe recomendar mercado usado solo cuando tenga sentido por precio, presupuesto o disponibilidad.

No debe decir simplemente:

> "Compra esta GPU usada."

Debe decir algo como:

> "Como compra nueva no la priorizaría, pero en mercado usado puede tener sentido si está bastante más barata que alternativas nuevas de rendimiento similar."

---

## Cuándo mencionar mercado usado

La IA puede mencionar mercado usado si se cumple una o varias de estas condiciones:

- El usuario tiene un presupuesto muy ajustado.
- El componente nuevo está inflado de precio.
- El componente sigue rindiendo bien, pero ya no es ideal como compra nueva.
- La alternativa usada es claramente más barata que una nueva equivalente.
- El usuario pregunta explícitamente por opciones usadas.
- El usuario busca maximizar rendimiento por euro.
- El componente pertenece a una generación anterior, pero aún tiene buen rendimiento.

---

## Cuándo evitar mercado usado

La IA debe evitar recomendar mercado usado como primera opción en estos casos:

- El usuario quiere máxima fiabilidad o garantía.
- El usuario está montando un PC para trabajo crítico.
- El ahorro frente a nuevo es pequeño.
- El componente tiene alto riesgo de desgaste.
- No hay forma de comprobar estado, garantía o funcionamiento.
- La pieza usada es demasiado antigua o tiene alternativas nuevas mejores.

---

## Componentes que deben tratarse con mucho cuidado usados

### Fuentes de alimentación / PSU

No recomendar fuentes usadas salvo casos muy concretos.

Motivos:

- Degradación interna difícil de comprobar.
- Riesgo para otros componentes.
- Garantía y protecciones importantes.
- Una PSU defectuosa puede dañar el equipo.

Respuesta recomendada:

> "No recomiendo comprar una fuente usada salvo que sea de muy alta calidad, esté en perfecto estado y tenga garantía. En general, es mejor comprar PSU nueva."

---

### SSD / almacenamiento

No recomendar SSDs usados salvo que el usuario pueda comprobar salud, TBW, horas de uso y estado SMART.

Respuesta recomendada:

> "Un SSD usado solo tendría sentido si puedes comprobar su salud y desgaste. Si no, preferiría uno nuevo, aunque sea más sencillo."

---

### Placas base

Las placas usadas pueden tener sentido para upgrades o plataformas antiguas, pero no deben ser primera opción en una build nueva salvo precio muy bueno.

Riesgos:

- Pines dañados.
- BIOS antigua.
- Fallos en slots RAM/PCIe/M.2.
- VRM degradado.
- Garantía limitada.

---

## GPUs usadas

Las GPUs usadas pueden ser una buena opción si el precio es claramente inferior al de alternativas nuevas equivalentes.

La IA debe considerar:

- Rendimiento frente a GPUs nuevas de precio similar.
- Cantidad de VRAM.
- Consumo.
- Temperaturas.
- Posible uso previo en minería.
- Estado físico.
- Garantía restante.
- Si el vendedor permite pruebas.

La IA no debe recomendar una GPU usada solo porque sea barata. Debe seguir siendo útil para el uso del usuario.

---

## GPUs de generación anterior reciente

Las NVIDIA RTX 4000 y AMD RX 7000 no deben tratarse como obsoletas en rendimiento.

Sin embargo, sí deben considerarse generaciones en transición frente a RTX 5000 y RX 9000.

Como compra nueva, no deben recomendarse automáticamente salvo que tengan un precio claramente competitivo.

En mercado usado pueden ser opciones muy interesantes si:

- El precio es bastante inferior al de GPUs nuevas equivalentes.
- Mantienen buen rendimiento para 1080p o 1440p.
- Tienen suficiente VRAM para el uso previsto.
- El vendedor es fiable.
- El estado físico y térmico es comprobable.
- Conservan garantía o factura si es posible.

La IA debe explicar que estas GPUs pueden ser mejor compra usadas que nuevas, especialmente si las nuevas generaciones están infladas de precio.

Ejemplo de respuesta:

> "Una RTX 4070 sigue rindiendo bien, pero como compra nueva ya debe compararse con RTX 5000 y RX 9000. En mercado usado puede ser mucho más interesante si aparece bastante más barata que alternativas actuales."

Ejemplo AMD:

> "Una RX 7800 XT puede seguir siendo muy buena opción, sobre todo si aparece a buen precio. Como nueva depende mucho del precio; usada o en oferta fuerte puede ser más recomendable."

---

## GPUs antiguas o de gama baja

Algunas GPUs no deberían recomendarse como compra nueva, pero pueden mencionarse en mercado usado si el precio es muy bajo.

Ejemplos:

- RTX 3050
- GTX 1660 / 1660 Super
- RTX 2060
- RX 580 / RX 590
- GTX 1650
- RX 6500 XT

Regla:

> No recomendarlas como primera opción nueva. Solo mencionarlas usadas si el presupuesto es muy ajustado y el precio es claramente mejor que alternativas modernas.

Ejemplo:

> "La RTX 3050 no suele ser buena compra nueva. Solo la consideraría usada y a precio muy bajo; si no, miraría antes RX 6600, RX 7600 o RTX 4060 según precio."

---

## CPUs usadas

Las CPUs usadas suelen ser menos arriesgadas que GPUs o fuentes, pero la IA debe evaluar si tienen sentido como upgrade o como plataforma nueva.

Pueden tener sentido si:

- El usuario ya tiene una placa compatible.
- Es un upgrade barato.
- El rendimiento sigue siendo suficiente.
- El precio es claramente mejor que una plataforma nueva.

No deben recomendarse automáticamente para builds nuevas si obligan a comprar una plataforma antigua sin futuro.

Ejemplo:

> "Un Ryzen 5 5600 usado puede ser muy buena opción para actualizar un equipo AM4 barato. Para una build nueva, habría que compararlo contra AM5 considerando también placa y RAM."

---

## RAM usada

La RAM usada puede ser aceptable si el precio es bueno y el vendedor es fiable.

La IA debe considerar:

- Tipo de RAM: DDR4 o DDR5.
- Capacidad.
- Frecuencia y latencia.
- Compatibilidad con CPU/placa.
- Posibles errores de memoria.
- Garantía restante.

Regla:

> La RAM usada puede tener sentido, pero no debe compensar si la diferencia frente a nueva es pequeña.

---

## Relación con calidad/precio

El mercado usado debe evaluarse siempre con el sistema de calidad/precio de la web cuando sea posible.

Si el usuario introduce un precio usado personalizado, la IA debe considerar ese precio para recalcular o interpretar la calidad/precio.

Reglas:

- Una pieza con mala calidad/precio nueva puede mejorar mucho si aparece usada barata.
- Una pieza antigua no se vuelve recomendable automáticamente por ser barata.
- La IA debe comparar contra alternativas de precio similar.
- La IA debe evitar conclusiones absolutas sin precio.

Ejemplo:

> "A precio nuevo no la recomendaría, pero si la encuentras usada por bastante menos, la calidad/precio puede cambiar mucho. Conviene compararla contra alternativas cercanas antes de decidir."

---

## Riesgos que la IA debe mencionar

Cuando recomiende o mencione mercado usado, debe advertir de forma breve sobre riesgos relevantes:

- Garantía inexistente o limitada.
- Estado real difícil de verificar.
- Desgaste.
- Temperaturas altas.
- Uso intensivo previo.
- Posible minería en GPUs.
- Fallos ocultos.
- Falta de factura.
- Vendedor poco fiable.

No es necesario repetir todos los riesgos en cada respuesta, pero sí mencionar los más importantes según el componente.

---

## Lenguaje recomendado

Frases útiles:

- "Como compra nueva no la priorizaría, pero usada puede tener sentido si el precio es muy bajo."
- "Solo la consideraría usada si está claramente por debajo de alternativas nuevas de rendimiento similar."
- "Antes de comprarla usada, revisaría estado, temperaturas, garantía y vendedor."
- "No es una mala GPU en rendimiento, pero como nueva depende mucho del precio."
- "Puede ser mejor opción usada que nueva si la diferencia de precio es grande."
- "Si el ahorro es pequeño, preferiría comprar nuevo por garantía y menor riesgo."

---

## Reglas finales

- No presentar el mercado usado como opción igual de segura que comprar nuevo.
- No recomendar componentes usados si el ahorro no compensa el riesgo.
- No recomendar PSU usada salvo excepción muy clara.
- No recomendar SSD usado sin datos de salud.
- Para GPUs usadas, valorar siempre VRAM, rendimiento, consumo, estado y precio.
- Para CPUs usadas, distinguir entre upgrade y build nueva.
- Comparar siempre contra alternativas nuevas y usadas de precio similar.
- Si no hay precio, pedir al usuario un precio aproximado antes de concluir.
