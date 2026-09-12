# Metodología de cálculo de notas GPU v2

Fecha de referencia: 14 de agosto de 2026.

Esta versión utiliza únicamente los campos actuales del catálogo. No utiliza
FPS medios todavía. Todas las notas están limitadas a `[0, 10]` y la interfaz
las muestra con un decimal.

## Campos utilizados

```text
name
brand
price_base_usd
benchmarks.3dmark_time_spy
benchmarks.3dmark_port_royal
benchmarks.3dmark_speed_way
benchmarks.blender_score
specs.tdp
specs.vram_capacity
specs.bus_width
specs.vram_type
technologies
description
```

No se utilizan:

```text
1080p_gaming_avg_fps
1440p_gaming_avg_fps
4k_gaming_avg_fps
```

Los datos JSONB inválidos o ausentes se convierten en valores vacíos o `0`.
Las tecnologías se normalizan para reconocer variantes como `FSR3`, `FSR 3` y
`FSR-3`.

## Interpolación común

```text
progreso = (valor - valor_inferior) / (valor_superior - valor_inferior)
nota = nota_inferior + progreso × (nota_superior - nota_inferior)
```

Un valor `<= 0` obtiene `0`, un valor intermedio se interpola y un valor por
encima del último anclaje queda en el techo.

## Rasterización

En v2 se utiliza únicamente `benchmarks.3dmark_time_spy`:

| Time Spy | Nota |
| ---: | ---: |
| 3.000 | 1,0 |
| 5.000 | 2,0 |
| 8.000 | 3,0 |
| 12.000 | 4,0 |
| 16.000 | 5,0 |
| 22.000 | 6,0 |
| 28.000 | 7,0 |
| 36.000 | 8,5 |
| 48.000 | 10,0 |

La mezcla futura con `gaming_raster_score` todavía no está activa.

## Ray Tracing

Se combinan Port Royal y Speed Way:

```text
Ray_Tracing = Port_Royal_Normalizado × 0,60
            + Speed_Way_Normalizado × 0,40
```

Si Speed Way no existe o es `0`, se utiliza únicamente Port Royal.

### Port Royal

| Port Royal | Nota |
| ---: | ---: |
| 250 | 1,0 |
| 500 | 2,0 |
| 4.000 | 3,0 |
| 8.000 | 4,5 |
| 12.000 | 6,0 |
| 16.000 | 7,2 |
| 22.000 | 8,5 |
| 28.000 | 9,3 |
| 36.000 | 10,0 |

### Speed Way

| Speed Way | Nota |
| ---: | ---: |
| 1.000 | 1,0 |
| 2.000 | 2,0 |
| 3.000 | 3,0 |
| 4.000 | 4,0 |
| 5.000 | 5,0 |
| 6.500 | 6,0 |
| 8.000 | 7,0 |
| 10.000 | 8,0 |
| 12.500 | 9,0 |
| 15.000 | 10,0 |

## Productividad

```text
Productividad = Renderizado × 0,50
              + Aceleración_Profesional × 0,35
              + Media_IA_Codecs × 0,15
```

### Renderizado

Usa `benchmarks.blender_score` y los anclajes existentes:

| Blender Score | Nota |
| ---: | ---: |
| 250 | 1,0 |
| 500 | 2,0 |
| 1.000 | 3,0 |
| 2.000 | 4,0 |
| 4.000 | 5,3 |
| 6.000 | 6,5 |
| 9.000 | 7,6 |
| 14.000 | 9,0 |
| 18.000 | 10,0 |

### Aceleración profesional

Con los datos actuales se usa una heurística temporal de arquitectura/marca:

```text
NVIDIA Blackwell / RTX 5000 = 9,5
AMD RDNA 4 / RX 9000        = 6,8
Desconocido                 = 4,0
```

Después se aplican incrementos pequeños si el texto contiene:

| Capacidad | Incremento |
| --- | ---: |
| CUDA | +0,3 |
| OptiX | +0,3 |
| Tensor | +0,2 |
| ROCm/HIP | +0,3 |
| AV1 | +0,1 |

El resultado se limita a `10`. La marca no es una penalización definitiva: es
un fallback temporal mientras la base de datos no tenga campos estructurados
de capacidades profesionales.

### Media, IA y codecs

Se suman señales del texto de tecnologías y descripción:

| Señal | Aporte |
| --- | ---: |
| AV1 | +2,0 |
| DLSS 4 o FSR 4 | +2,0 |
| Reflex o Anti-Lag | +1,5 |
| Ray Reconstruction o regeneración de rayos | +2,0 |
| Tensor, IA, AI, machine learning o redes neuronales | +2,5 |

La subpuntuación se limita a `10`.

## Memoria

El techo práctico de capacidad baja a `24 GB` y el bus gana peso:

```text
Capacidad = min(10, VRAM_GB / 24 × 10)
Memoria = Capacidad × 0,45
        + Bus × 0,40
        + Tipo_VRAM × 0,15
```

### Bus

| Bus | Nota |
| ---: | ---: |
| 64 bits | 2,0 |
| 128 bits | 4,0 |
| 192 bits | 6,0 |
| 256 bits | 8,0 |
| 384 bits | 9,5 |
| 512 bits | 10,0 |

El bus ausente o `0` obtiene `0`.

### Tipo de VRAM

| Tipo | Nota |
| --- | ---: |
| GDDR7 | 10,0 |
| GDDR6X | 8,5 |
| GDDR6 | 7,0 |
| GDDR5 | 3,0 |
| Desconocido | 0,0 |

## Eficiencia

```text
Rendimiento_Por_Vatio = Time_Spy / TDP
Eficiencia_Base = interpolar(Rendimiento_Por_Vatio)
Eficiencia = Eficiencia_Base × 0,65
           + Rasterización × 0,35
```

Los anclajes de rendimiento por vatio son:

| Time Spy por vatio | Nota |
| ---: | ---: |
| 20 | 1,0 |
| 30 | 3,0 |
| 50 | 5,0 |
| 70 | 7,0 |
| 90 | 8,5 |
| 120 | 10,0 |

Si el TDP no existe o es menor o igual que `0`, Eficiencia es `0`.

## Software

```text
Software = Escalado_Generación × 0,30
         + IA_Hardware × 0,20
         + RT_Avanzado × 0,20
         + Latencia_Media_Codecs × 0,15
         + Madurez_Ecosistema × 0,15
```

### Escalado y generación

```text
DLSS 4              = 10
FSR 4               = 8
DLSS 3 / FSR 3      = 7
DLSS / FSR genérico = 4
Sin señal           = 0
```

### IA hardware

```text
NVIDIA con Tensor/IA clara = 10
AMD con IA/aceleración     = 6
Sin IA clara               = 0
```

### Ray Tracing avanzado

```text
Ray Reconstruction / Path Tracing = 10
RT moderno con Speed Way          = 7
RT básico                         = 5
Sin RT                            = 0
```

### Latencia, media y codecs

```text
Reflex + AV1 / encoder válido = 10
Anti-Lag + AV1                = 8
Solo AV1 o encoder válido     = 5
Nada relevante                = 0
```

### Madurez del ecosistema

```text
NVIDIA RTX 5000 / Blackwell = 9,5
AMD RX 9000 / RDNA 4        = 7,0
Desconocido                 = 5,0
```

Los campos estructurados futuros pueden sustituir esta heurística:

```text
features.driver_maturity_score
features.game_support_score
features.creator_support_score
```

## GPU Gaming derivada

```text
GPU_Gaming = Rasterización × 0,45
           + Ray_Tracing × 0,25
           + Memoria × 0,15
           + Eficiencia × 0,10
           + Software × 0,05
```

Software tiene un peso reducido para que una tecnología detectada no compense
una diferencia grande de rendimiento bruto.

## Calidad/Precio

La fórmula v2 separa la valoración a MSRP del precio real.

### Índices por perfil

| Eje | Equilibrada | Gaming | Creación |
| --- | ---: | ---: | ---: |
| Rasterización | 30% | 45% | 0% |
| Ray Tracing | 20% | 25% | 10% |
| Productividad | 20% | 0% | 55% |
| Memoria | 15% | 15% | 20% |
| Eficiencia | 10% | 10% | 5% |
| Software | 5% | 5% | 10% |
| **Total** | **100%** | **100%** | **100%** |

```text
Índice = suma de cada nota técnica × peso del perfil
```

### Segmentos MSRP

```text
Entrada:      MSRP <= 349
Gama media:   350 <= MSRP <= 499
Media-alta:   500 <= MSRP <= 699
Alta:         700 <= MSRP <= 1199
Entusiasta:   MSRP >= 1200
```

### Nota base a MSRP

```text
ratio = Índice / MSRP
referencia = mediana del ratio para perfil y segmento
CP_MSRP = clamp(5,5 + 5 × ln(ratio / referencia), 2, 8)
```

### Ajuste por precio real

```text
CP_Final = clamp(CP_MSRP + 14 × ln(MSRP / precio_actual_USD), 0, 10)
```

Una rebaja fuerte eleva la nota y un sobreprecio la reduce con claridad.

El código admite referencias por producto mediante:

```text
product.gpu_value_references[perfil][segmento]
product.gpu_value_reference_ratios[perfil]
```

Mientras no se hayan cargado las medianas por perfil/segmento, se utiliza una
referencia inicial de `0,0135`, calibrada como bootstrap para el catálogo
actual. La mediana real del catálogo debe sustituir este fallback cuando se
incorpore al modelo de datos.

El precio en euros se convierte a USD antes de evaluar la nota. El selector de
perfil solo se muestra para GPU; CPU, RAM y el resto de componentes no reciben
este parámetro.

## Integración en combos y builds

La GPU participa con:

- Potencia: `Rasterización`.
- Productividad: `Productividad`.
- Gaming y Cuello de Botella: `GPU_Gaming`.
- Eficiencia: `Eficiencia`.
- Calidad/Precio: perfil `balanced` por defecto.

Los pesos globales de combos y builds se mantienen separados de los pesos
internos de la GPU.

## Estado futuro

Cuando los datos estén más limpios, se podrán añadir `gaming_raster_score`,
FPS o campos estructurados de CUDA/OptiX/ROCm/codec. En v2 esos campos no son
necesarios para que el cálculo funcione y los FPS medios permanecen excluidos.
