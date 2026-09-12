# Resumen del sistema de notas de CoreX Scoring

Este documento describe el sistema que está activo en `src/lib/scoring` a fecha de su creación. Es la referencia de implementación: las fórmulas calculan valores entre **0 y 10** (limitados a ese intervalo) y los resultados agregados de combos y builds se muestran redondeados a un decimal.

## Estructura general

El sistema tiene tres dominios:

| Nivel | Elementos evaluados | Resultado |
| --- | --- | --- |
| Componente | CPU, GPU, RAM, almacenamiento, placa base y fuente (PSU) | Notas técnicas y nota de calidad/precio propias del tipo de componente. |
| Combo | CPU + GPU + RAM | Potencia, productividad, gaming, eficiencia, cuello de botella y calidad/precio. |
| Build | CPU + GPU + RAM + placa + almacenamiento + PSU | Rendimiento, equilibrio, compatibilidad, capacidad de actualización y calidad/precio. |

Un combo sin CPU, GPU o RAM, o una build sin sus seis piezas, se considera incompleto y devuelve todas sus notas agregadas a `0`.

## Notas de componentes

Cada componente se evalúa con datos estructurados, especificaciones, benchmarks y tecnologías. No existe una nota única transversal de rendimiento: cada categoría publica los ejes que mejor representan su función.

| Componente | Notas técnicas visibles |
| --- | --- |
| CPU | Potencia, Productividad, Gaming, Eficiencia, Plataforma. |
| GPU | Rasterización, Productividad, Gaming, Eficiencia, Tecnologías. |
| RAM | Velocidad, Tecnologías, Latencia, Gaming, Productividad. |
| Almacenamiento | Velocidad, Tecnologías, Temperaturas, Durabilidad, Eficiencia. |
| Placa base | Estabilidad, Expansión, Conectividad, Tecnologías, Compatibilidad. |
| PSU | Estabilidad eléctrica, Conectividad, Protecciones, Construcción, Eficiencia. |

### CPU

La versión activa usa referencias fijas, por lo que añadir productos al catálogo no desplaza las notas existentes. Potencia combina Cinebench multinúcleo, PassMark, frecuencia turbo y arquitectura/IPC. Productividad prioriza Cinebench y PassMark multinúcleo, hilos, núcleos eficientes y capacidad/plataforma profesional. Gaming combina rendimiento mononúcleo, caché, núcleos de rendimiento, turbo, arquitectura y plataforma. Eficiencia cruza rendimiento por vatio con la huella de consumo. Plataforma valora socket, tipo y velocidad de RAM, PCIe y RAM máxima soportada.

### GPU

También usa normalización fija. Rasterización, ray tracing, productividad y eficiencia se obtienen de benchmarks y consumo; la VRAM aporta margen tanto a gaming como a creación. La nota de Gaming pondera rasterización (55 %), ray tracing (25 %), VRAM (12 %) y tecnología gaming (8 %). Productividad pondera Blender (70 %), VRAM (20 %) y capacidad para creación (10 %). Tecnologías evalúa escalado, ray tracing/IA, multimedia, latencia y ecosistema; las familias Ampere, Ada, Blackwell, RDNA 2/3/4 y Xe2 tienen perfiles de capacidad base para evitar depender del texto comercial del producto.

### RAM

Velocidad combina frecuencia y ancho de banda al 50 %. Latencia combina latencia real (60 %) y teórica (40 %), con una referencia de 8 a 16 ns. Gaming pondera velocidad (45 %), latencia (35 %), canales (15 %) y estabilidad (5 %). Productividad pondera capacidad (45 %), velocidad (30 %), canales (15 %) y latencia (10 %). Tecnologías considera generación, perfiles, electrónica, overclock, compatibilidad y plataforma.

### Almacenamiento

Velocidad evalúa lectura y escritura teóricas y reales. Tecnologías combina interfaz (35 %), NAND (25 %), caché (22 %) e integridad (18 %). Temperaturas se basa principalmente en el margen térmico (88 %) y, en menor medida, en sus funciones térmicas (12 %). Durabilidad pondera TBW por TB (70 %), TBW absoluto (15 %), NAND (10 %) e integridad (5 %). Eficiencia mezcla energía por GB (70 %), rendimiento (20 %) y características de consumo (10 %); si la energía se estima por falta de datos, la nota queda limitada a 7,7.

### Placa base

Estabilidad eléctrica pondera calidad de VRM (45 %), disipación (30 %), fases de CPU (20 %) y arquitectura (5 %). Expansión valora la ranura GPU principal (32 %), M.2 (43 %, con rendimientos decrecientes por más ranuras) y PCIe secundario (25 %). Conectividad combina Wi‑Fi (22 %), LAN (22 %), USB (36 %) e I/O avanzado (20 %). Tecnologías incluye audio, recuperación de BIOS, diagnósticos, comodidad de montaje, ajuste y arranque. Compatibilidad/actualidad de plataforma pondera socket (55 %), memoria (25 %) y preparación PCIe (20 %).

### Fuente de alimentación (PSU)

Estabilidad eléctrica depende sobre todo del rizado medido (95 %) y, en menor medida, de la topología (5 %). Conectividad valora conectores PCIe antiguos y modernos, EPS, SATA, Molex y modularidad; con datos insuficientes usa una evaluación limitada basada en ATX y modularidad. Protecciones cubre OCP, OVP, UVP, OPP, SCP y OTP, con puntos adicionales para SIP, NLO y BOP. Construcción combina rizado, topología, componentes, refrigeración/ruido y garantía. Eficiencia prioriza la medición al 50 % de carga (75 %) sobre la certificación (25 %); sin medición no puede superar 7,5.

## Calidad/precio

La calidad/precio no usa el MSRP individual como referencia en tiempo de ejecución. Primero se calcula un **precio justo** a partir de la utilidad técnica y después se compara contra el precio que se esté evaluando.

```text
ratio = precio_justo / precio_evaluado
nota = interpolación(ratio)
```

La curva estándar asigna 5 puntos cuando el precio justo y el evaluado coinciden; llega a 7 con un ratio de 1,5, a 8,2 con 2, a 9,2 con 3 y a 10 con 5 o más. RAM usa una curva algo más rápida: llega a 10 con ratio 3. Si no hay precio válido o precio justo calculable, la nota es 0.

CPU y GPU usan perfiles de valor seleccionables:

| Componente | Equilibrada | Gaming | Productividad / Creación |
| --- | --- | --- | --- |
| CPU | Potencia 25 %, productividad 25 %, gaming 30 %, eficiencia 10 %, plataforma 10 %. | Potencia 15 %, gaming 65 %, eficiencia 8 %, plataforma 12 %. | Potencia 18 %, productividad 65 %, eficiencia 10 %, plataforma 7 %. |
| GPU | Rasterización 20 %, productividad 22 %, gaming 35 %, eficiencia 8 %, tecnologías 15 %. | Rasterización 20 %, gaming 56 %, eficiencia 9 %, tecnologías 15 %. | Rasterización 10 %, productividad 64 %, eficiencia 6 %, tecnologías 20 %. |

RAM, almacenamiento, placa y PSU calculan su precio justo a partir de sus notas técnicas y, respectivamente, capacidad/generación, capacidad por TB, longevidad de plataforma y potencia nominal. Los precios se comparan internamente en USD para mantener una misma base de referencia.

## Notas de combos

El combo toma las notas de sus tres componentes con sus precios efectivos y calcula:

| Nota | Fórmula / pesos |
| --- | --- |
| Potencia | CPU 40 %, GPU (rasterización) 45 %, velocidad RAM 7,5 %, latencia RAM 7,5 %. |
| Productividad | CPU 40 %, GPU 40 %, RAM 20 %. |
| Gaming | CPU 30 %, GPU 55 %, RAM 15 %. |
| Eficiencia | GPU 60 %, CPU 40 %. |
| Cuello de botella | Parte de 10; resta 1,2 × (75 % de la diferencia CPU/GPU + 25 % del déficit de RAM respecto al nivel principal). La RAM por encima del nivel CPU/GPU no penaliza. |
| Calidad/precio | Suma los precios justos de CPU, GPU y RAM y aplica la curva común contra el precio total efectivo. |

El precio efectivo de cada pieza respeta, por este orden, el precio personalizado de un borrador, el precio personalizado guardado en la moneda solicitada, el personalizado en la otra moneda convertido, el precio base y, como último recurso, el precio base de la otra moneda convertido.

## Notas de builds completas

Las builds usan las notas de los seis componentes y añaden controles relacionales de las piezas.

| Nota | Fórmula / pesos |
| --- | --- |
| Potencia | GPU (rasterización) 42,5 %, CPU 37,5 %, velocidad RAM 7,5 %, velocidad de almacenamiento 7,5 %, latencia RAM 5 %. |
| Productividad | CPU 35 %, GPU 30 %, RAM 20 %, almacenamiento 15 %. La nota de almacenamiento es velocidad 70 %, durabilidad 20 %, temperaturas 10 %. |
| Gaming | GPU 52,5 %, CPU 27,5 %, RAM 15 %, almacenamiento 5 %. El almacenamiento mezcla velocidad 85 % y temperaturas 15 %. |
| Eficiencia | GPU 40 %, CPU 30 %, PSU 20 %, almacenamiento 10 %. |
| Cuello de botella | Parte de 10 y resta 1,15 × (70 % diferencia CPU/GPU + 20 % déficit de RAM + 10 % déficit de almacenamiento), respecto al mayor nivel entre CPU y GPU. |
| Compatibilidad | CPU/placa 30 %, RAM/plataforma 20 %, PSU 25 %, GPU/placa 10 %, almacenamiento/placa 10 % y nota propia de compatibilidad de placa 5 %. |
| Actualizaciones | Plataforma 30 %, expansión interna de la placa 25 %, margen PSU 20 %, margen RAM 15 %, margen de almacenamiento 10 %. |
| Calidad/precio | Suma los precios justos de las seis piezas, aplica la curva de valor al total y puede limitarse por compatibilidad. |

### Qué comprueba la compatibilidad

- CPU y placa: coincidencia de socket (70 %) y chipset (30 %).
- RAM y plataforma: tipo (55 %), capacidad soportada (20 %) y frecuencia (25 %).
- PSU: margen de potencia recomendado del 30 % (75 %) y conectores requeridos por la GPU (25 %).
- GPU y placa: presencia de una ranura PCIe x16 (60 %) y generación PCIe (40 %).
- Almacenamiento y placa: ranura/interfaz disponible (60 %), generación (30 %) y margen de ranuras (10 %).

Si faltan datos relacionales, se emplean valores neutrales en vez de declarar compatibilidad total. Además, incompatibilidades críticas aplican techos: socket incompatible (máximo 3), RAM de tipo incompatible (máximo 4), PSU por debajo del consumo estimado (máximo 5, o 3 si está críticamente por debajo), conector de GPU ausente (máximo 4), ranura GPU ausente (máximo 4) o ranura de almacenamiento ausente (máximo 6).

La nota de actualizaciones contempla la vigencia del socket, DDR y PCIe, la expansión de placa, el margen de potencia y conectores de la PSU, la RAM aún ampliable y las ranuras de almacenamiento libres. Las incompatibilidades también la limitan; si la compatibilidad global baja de 5, no puede superar esa compatibilidad.

Para calidad/precio de la build, una compatibilidad inferior a 5 limita la nota al valor de compatibilidad; si es de 4 o menos, la calidad/precio no puede superar 2.

## Convenciones y límites de interpretación

- Las notas son comparativas y orientativas; no sustituyen comprobar manualmente requisitos específicos, BIOS, dimensiones físicas o soporte real de un fabricante.
- Las notas de valor dependen del precio evaluado: cambiar el precio puede cambiar solo calidad/precio sin modificar las notas técnicas.
- Las referencias de CPU y GPU son fijas para proporcionar estabilidad frente al crecimiento del catálogo.
- La aplicación conserva algunas claves antiguas (`Juegos` frente a `Gaming`, y variantes de `Calidad precio`) para mantener compatibilidad con datos persistidos. Las claves públicas actuales de los calculadores son las listadas en este documento.

## Código fuente principal

- Orquestación: `src/lib/scoring/components/index.ts`, `src/lib/scoring/combos/index.ts` y `src/lib/scoring/builds/index.ts`.
- Configuración de componentes: `src/lib/scoring/components/config/`.
- Configuración de combos y builds: `src/lib/scoring/combos/config/weights.ts` y `src/lib/scoring/builds/config/weights.ts`.
- Curva común de valor: `src/lib/scoring/components/calculations/value-curve.ts`.
