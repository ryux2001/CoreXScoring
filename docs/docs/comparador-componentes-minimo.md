# Comparador mínimo de componentes (1 vs 1 vs 1)

Esta guía describe únicamente el comparador de **componentes individuales**. No incluir `combos`, `builds`, navbar, autenticación, guardados ni precios personalizados por pieza. El objetivo es seleccionar de uno a tres productos del mismo tipo, mostrar sus notas recalculadas con el precio visible y sus especificaciones.

## Contrato de datos

Cada producto necesita como mínimo: `id`, `slug`, `name`, `brand`, `type`, `price_base_usd`, `price_base_eur`, `specs`, `benchmarks`, `compatibility` y `technologies`. Los tres últimos campos pueden ser objetos o texto JSON. Los tipos admitidos son `CPU`, `GPU`, `RAM`, `STORAGE`, `MOTHERBOARD` y `PSU`.

Todos los cálculos de valor usan dólares estadounidenses. Antes de puntuar, convertir el precio que ve el usuario a USD.

## Comportamiento que debe tener la página

1. Estado: `items[]` (máximo 3), `lockedType`, `evaluatedPrices[id]`, moneda y texto de búsqueda.
2. Al añadir el primero, fijar `lockedType = product.type.toUpperCase()`. Rechazar duplicados, un cuarto producto o un tipo distinto. Al eliminar el último, liberar el tipo.
3. Búsqueda con *debounce* de 300 ms, desde dos caracteres, por `name` (puede además coincidir localmente con `brand`, `type` y `slug`). Solicitar hasta 5 resultados y, si `lockedType` existe, filtrar por ese tipo. Al seleccionar, añadir el producto completo.
4. Cada tarjeta muestra nombre, marca, precio editable, las notas técnicas, y `Calidad precio` como evaluación global. Al cambiar el precio de una tarjeta, recalcular solo su calidad/precio; las notas técnicas no cambian.
5. Para cada nota técnica, marcar como ganadores todos los productos empatados con el máximo positivo. No incluir `Calidad precio` en esa lista de notas técnicas; mostrarla aparte.
6. Debajo de las tarjetas, una tabla con una primera columna de etiqueta y tres columnas fijas de producto. Dejar las columnas ausentes vacías. En móvil permitir desplazamiento horizontal. Extraer una especificación buscando en orden `specs`, `compatibility`, `benchmarks`; las claves con puntos navegan objetos anidados.

No hace falta replicar la URL dinámica ni `localStorage` para este mini proyecto. Si se desea persistir, guardar `items`, `lockedType` y moneda; no es necesario persistir los precios evaluados.

## Moneda

- Monedas: `USD` y `EUR`; por defecto `USD`.
- Constante: `USD_TO_EUR_RATE = 1.05`.
- `convert(v, USD, EUR) = round2(v * 1.05)`; `convert(v, EUR, USD) = round2(v / 1.05)`; misma moneda: `round2(v)`.
- `round2(v) = Math.round((v + Number.EPSILON) * 100) / 100`; un valor no finito equivale a `0`.
- Para mostrar el precio inicial usar `price_base_eur` en EUR y `price_base_usd` en USD; si falta, usar `price` o `0`.
- Persistencia opcional de la preferencia: cookie `corex_currency`, `Path=/`, `SameSite=Lax`, duración 365 días. La consulta `?currency=` tiene prioridad sobre la cookie.

## Primitivas de puntuación

Todas las notas se limitan a `[0, 10]`. Salvo donde se indique, se redondean solo al mostrar; RAM, storage, placa y PSU redondean a una decimal al final de cada nota.

- `clamp(x) = min(10, max(0, x))`.
- `I(x; (x0,y0),...,(xn,yn))`: interpolación lineal entre anclas, usando el primer/último `y` fuera de rango.
- `Nlog(x; low, high) = clamp(1 + 9 * ln(x/low) / ln(high/low))`; si `x <= 0`, es `0`.
- Las curvas de calidad/precio usan `r = fairPrice / evaluatedPrice`. Si precio o precio justo no son positivos, la nota es `0`.
- Curva estándar `V(r)`: `(0,0),(0.25,1),(0.5,3),(0.75,4),(1,5),(1.25,6),(1.5,7),(2,8.2),(3,9.2),(4,9.7),(5,10)` con `I`.
- Curva de RAM: `(0,0),(0.25,1),(0.5,3),(0.75,4),(1,5),(1.25,6),(1.5,7),(2,8.3),(2.5,9.2),(3,10)`.

## Fórmulas activas de las notas

Las fórmulas siguientes son las que usa el orquestador `getComponentNotes`. No usar los cálculos heredados que conviven en algunos archivos.

### CPU

Campos: `benchmarks.geekbench_single`, `cinebench_multi`, `passmark_score`; `specs.turbo_frequency`, `power_turbo_max`, `cache.l3` (KB), `cores`, `efficency_cores`, `architecture`; `compatibility.socket`, `ram_type`, `ram_frecuency`, `pcie`, `ram_max_support`.

Normalizaciones: Geekbench `(1500,3300)`, Cinebench `(8000,45000)`, PassMark `(12000,72000)`, turbo `(4,6.2)`, Cinebench/W `(80,280)`, PassMark/W `(130,440)`, todas con `Nlog`.

- **Potencia** = `clamp(0.3*(0.1*Nlog(geekbench)+0.5*IPC+0.4*Nlog(turbo)) + 0.4*Nlog(cinebench) + 0.3*Nlog(passmark))`.
- **Productividad** = `clamp(0.65*Nlog(cinebench) + 0.35*Nlog(passmark))`.
- **Gaming** = `clamp(0.15*Nlog(geekbench) + 0.20*Nlog(turbo) + 0.35*I(cacheL3KB/1024; (12,3),(16,4),(20,5),(24,5.5),(32,6.5),(36,7),(64,8.5),(96,10),(128,10)) + 0.25*gamingArquitectura + 0.05*I(pCores; (4,6),(6,10),(8,10)))`, donde `pCores=max(0, cores-efficency_cores)`.
- **Eficiencia**: si Cinebench, PassMark o potencia máxima son `<=0`, `0`; si no, `clamp(0.6*(0.6*Nlog(cinebench/power)+0.4*Nlog(passmark/power)) + 0.4*I(power; (65,10),(76,9.6),(88,9),(117,7.5),(142,6),(162,5),(181,4.2),(230,2.5),(253,2)))`.
- **Plataforma** = `clamp(0.35*socket + 0.20*RAMtipo + 0.15*I(ramMHz;(3200,4),(4800,7),(5200,8),(5600,9),(6400,10)) + 0.20*PCIe + 0.10*I(ramMáximaGB;(128,6),(192,8),(256,10)))`.

Matrices CPU: `socket={AM4:5, AM5:10, LGA 1700:7, LGA 1851:8.5}`; `RAMtipo={DDR4:4, DDR5:9, DDR4/DDR5:9.5}`; `PCIe={3:3,4:7,5:10}`. Perfiles de arquitectura `(IPC,gaming)`: Zen3 `(5.5,5.8)`, Zen3 X3D `(5.5,8.5)`, Zen4 `(7.5,7.8)`, Zen4 X3D `(7.5,10)`, Zen5 `(9.2,9.2)`, Zen5 X3D `(9.2,10)`, Alder Lake `(6.7,6.8)`, Raptor Lake `(8.2,8.2)`, Raptor Refresh `(8.5,8.5)`, Arrow Lake `(9,8.8)`, desconocida `(0,0)`. Detectar X3D por nombre, arquitectura o tecnología; el resto por texto de `architecture`.

**Calidad precio CPU**: utilidad equilibrada `u=.25*Potencia+.25*Productividad+.30*Gaming+.10*Eficiencia+.10*Plataforma`; `fairPrice=exp(4.121929033922798 + .2647010271108512*u)`; nota `V(fairPrice/precioUSD)`. Hay perfiles opcionales: gaming `(.15,0,.65,.08,.12)` con `exp(3.8831317571530812+.2882655909149965u)` y productividad `(.18,.65,0,.10,.07)` con `exp(4.486911732428424+.219069818559873u)`.

### GPU

Campos: `benchmarks.3dmark_time_spy`, `3dmark_port_royal`, `blender_score`; `specs.tdp`, `vram_capacity`/`vram_gb`, `architecture`; nombre de producto. Normalizar con `Nlog`: raster `(3000,50000)`, RT `(250,36000)`, Blender `(250,18000)`, TimeSpy/W `(40,115)`.

- **Rasterización** = `Nlog(TimeSpy;3000,50000)`.
- **VRAM** = `I(GB;(4,2),(6,4),(8,6),(10,7),(12,8),(16,9.25),(20,9.75),(24,10),(32,10))`.
- **Productividad** = `clamp(.70*Nlog(Blender;250,18000)+.20*VRAM+.10*creatorArquitectura)`.
- **Gaming** = `clamp(.55*Rasterización+.25*Nlog(PortRoyal;250,36000)+.12*VRAM+.08*gamingTechArquitectura)`.
- **Eficiencia** = `0` si Time Spy o TDP `<=0`; en otro caso `Nlog(TimeSpy/TDP;40,115)`.
- **Tecnologías** = `clamp(.30*scaling+.25*rayTracingAI+.15*media+.10*latency+.20*ecosystem)`.

Perfil `(scaling,rayTracingAI,media,latency,ecosystem,creator,gamingTech)`: Ampere `(5,6.5,6,8,9.8,8.2,6.5)`, Ada `(8.5,8.5,9,8.5,9.5,9.5,8.5)`, Blackwell `(10,10,9.5,10,10,10,10)`, RDNA2 `(4,4.5,5,6,5.5,4.8,5)`, RDNA3 `(7,6.5,8.5,7,5.5,6.3,6.8)`, RDNA4 `(9,8.5,9,8.5,8.5,7.5,8.7)`, Xe2 `(8,7.5,8.5,7,7,7.3,8)`, desconocida todo `0`. Detectar en arquitectura/nombre: Blackwell/RTX 50, Ada/Lovelace, Ampere, RDNA 4/3/2, Xe2/Battlemage.

**Calidad precio GPU**: utilidad equilibrada `u=.20*Rasterización+.22*Productividad+.35*Gaming+.08*Eficiencia+.15*Tecnologías`; `fairPrice=exp(4.3804121923748385+.28469060436497984*u)`; nota `V(fairPrice/precioUSD)`. Perfiles opcionales: gaming `(.20,0,.56,.09,.15)`, modelo `exp(4.4012011204435595+.2806701556376565u)`; creación `(.10,.64,0,.06,.20)`, modelo `exp(4.523431585142381+.26241687025975713u)`.

### RAM

Normalizar: `speedMt` desde `specs.speed`; capacidad desde `specs.capacity`; CAS desde `cas_latency` o `latency`; módulos: número antes de `x` en `dual_channel`/`module_count`, si no `2` con `true`, si no `1`. `channel=1` con dos o más módulos, `0.76` con uno. `latencyNs=2000*CAS/speedMt`; `bandwidthGBs=speedMt*moduleCount*8/1000`.

- **Velocidad** = una decimal de `2 + 8*clamp01((bandwidth-20)/(100-20))`.
- **Latencia** = una decimal de `10*(1-clamp01((latencyNs-8)/(16-8)))`.
- `profile=1` con XMP y EXPO, `.72` con uno, `.35` sin ambos; sumar `.05` si aparece XMP3 o EXPO2 y limitar a 1. `OC=1/.72/.45/.55` según texto alto/medio/bajo/otro. `electronics=1` con PMIC, On-Die ECC o ECC dedicado; si no `.35`. `platform=.45*(DDR>=5?1:DDR4?.62:.4)+.30*profile+.15*electronics+.10*OC`.
- **Tecnologías** = una decimal de `10*(.95*platform + .05*(compatibilidadValidada?1:(XMP||EXPO?.72:.45)))`; compatibilidad validada se detecta por `compatib`, `validation`, `tested` o Intel y AMD.
- **Gaming** = una decimal de `10*(.45*Velocidad/10+.35*Latencia/10+.15*channel+.05*(.7*profile+.3*OC))`; multiplicar por `.8` si capacidad `<8GB`, por `.92` si está entre 8 y 16GB.
- **Productividad** = una decimal de `10*(.45*capacidadScore/10+.30*Velocidad/10+.15*channel+.10*Latencia/10)`, donde `capacidadScore=I(capacidadGB;(8,4),(16,5.8),(32,7.5),(64,9),(96,10))`; por debajo de 8GB escala lineal desde 0 a 4.

**Calidad precio RAM**: recalcular las cinco notas desde el producto si hay speed, CAS y capacidad válidos. `base=(.30*Velocidad+.25*Productividad+.20*Latencia+.15*Tecnologías+.10*Gaming)/10`; `utility=base*(.7 si <8GB, .88 si <16GB, 1 en otro caso)`. `capacityReference=I(capacidadGB, anclas)` usando DDR5 `[(8,30),(16,55),(32,110),(64,200),(96,285),(128,365)]`, DDR4 `[(8,25),(16,45),(32,80),(64,145),(96,205),(128,260)]`, u otra `[(8,22),(16,40),(32,75),(64,135),(96,195),(128,250)]`. `fairPrice=capacityReference*(.8+.4*utility)`; usar la curva especial de RAM.

### Storage

Preferir `benchmarks.crystal_disk_read/write`; si no existen usar `specs.read_speed/write_speed`. Capacidad en GB (`"TB"` multiplica por 1000). `energy_per_gb <=1.5` se multiplica por 10; si falta, estimar `8.8/7.2/6.4/5.4` según PCIe `>=5/>=4/>=3/otro`, y limitar la nota final a 7.7.

- **Velocidad** = una decimal de `10*(.55*ln(1+min(read,15000)/400)/ln(1+15000/400)+.45*ln(1+min(write,14000)/400)/ln(1+14000/400))`.
- **Tecnologías** = una decimal de `10*(.35*interface+.25*NAND+.22*cache+.18*integrity)`. `interface=.75*PCIe+.25*protocol`; PCIe `Gen5=1, Gen4=.78, Gen3=.58, NVMe desconocido=.62, SATA=.35`; protocolo `NVMe2=.95, 1.4=.82, 1.3=.76, otro NVMe=.8, SATA=.35`; NAND `SLC=.95, MLC=.9, MLC+TLC=.86, TLC=.82, 3D=.64, QLC=.42, otro=.55`; caché `DRAM=.95,HMB=.72,SLC=.58,ninguna=.35`; `integrity=min(1,.4+.12*número de ECC/LDPC/error correction/encryption/power loss/Pyrite/TCG)`.
- **Temperaturas** = una decimal de `.88*I(maxTemp;(45,10),(50,9.5),(55,8.8),(65,7),(70,6),(80,3.5),(85,2),(90,0))+.12*(thermalFeature*10)`. Sin medición, `maxTemp=85`; thermalFeature `.9` con gestión térmica, `.72` con disipador/heatspreader/nickel, `.3` sin señal.
- **Durabilidad** = una decimal de `.70*I(TBW/capacidadTB;(80,1.2),(220,3.5),(320,5),(600,7.8),(800,9.3),(1000,10))+.15*I(TBW;(80,2),(220,4),(600,7),(1200,9),(1600,10))+.10*(NAND*10)+.05*min(10,4+1.2*integrityHits)`.
- **Eficiencia** = una decimal de `.70*I(energy;(2.45,10),(3.9,8.8),(4.95,7.5),(6.3,6.3),(7.8,4.8),(8.9,3.7),(10.1,2.5))+.20*min(10,10*ln(1+(read+write)/400)/ln(1+28100/400))+.10*(powerFeature*10)`; powerFeature `.9` con `low power`/`modern standby`, `.5` sin señal.

**Calidad precio storage**: `technical=.32*Velocidad+.22*Durabilidad+.18*Tecnologías+.15*Eficiencia+.13*Temperaturas`; `fairPrice=120*capacidadTB*(((technical/10)/.85)^(1/.65))`; nota con curva estándar.

### Motherboard

- **Estabilidad** = una decimal de `.45*vrm_quality_rating + .30*thermal + .20*I(fasesCPU;(4,3.5),(6,5),(8,6.5),(10,7.7),(12,8.6),(14,9.2),(16,9.7),(18,10)) + .05*I(máximo amperaje en tecnologías;(0,6),(70,8.5),(80,9),(90,9.5),(105,10))`. `thermal`: acceptable 5, average 6, good 7, very good 7.8, great 8.2, excellent 8.8, outstanding 9.4, exceptional 10, ausente 6.
- **Expansión** = una decimal de `.32*GPUprincipal+.43*M2+.25*PCIeSecundario`. Principal Gen5/4/3 = `10/8.5/6` (otro 0). Para M.2 ordenados por generación: sumar márgenes `[3.4,2.2,1.5,1,.6]` (los siguientes `.3`) por multiplicador Gen5 `1.15`, Gen4 `1`, Gen3 `.7`, otro `.5`; `M2=min(10,10*utilidad/9)`. Para PCIe secundarios, utilidad de ancho >=8/4/1 = `3.5/2.5/1`, por multiplicador Gen5 `1.2`, Gen4 `1`, Gen3 `.7`, otro `.5`; nota `min(10,10*utilidad/8)`.
- **Conectividad** = una decimal de `.22*WiFi+.22*LAN+.36*USB+.20*advancedIO`. WiFi 7/6E/6/5/no/otro = `10/8.5/7/4.5/0/3.5`; LAN 10/5/2.5/1 Gb = `10/8.5/7/4`, otro 3.5, +1 si dual o `+`; `usbUnits=1.6*C+.75*USB3+.2*USB2`; USB `I(units;(2,2.5),(4,4.5),(6,6.2),(8,7.7),(10,8.8),(12,9.6),(14,10))`; advanced I/O es 10 con USB4/Thunderbolt, 8.5/7/5 con 3/2/1 USB-C, 2 con ninguno.
- **Tecnologías** = una decimal de `.25*audio+.25*recovery+.20*diagnostics+.10*convenience+.10*tuning+.10*I(bootSeconds;(13,10),(14,9),(15,8),(16,7),(17,6),(18,5),(19,4),(20,3),(21,2),(22,1))`. Audio ESS/Sabre `10`, ALC4082/4080 `9.2`, S1220/ALC1220 `8.6`, ALC1200 `7.2`, ALC897/892/887 `4.5`, otro `5`. Recovery: Flashback/Flash BIOS/Q-Flash Plus 10; DualBIOS 9; EZ Flash/Q-Flash/Crashfree 7; Click BIOS 5; otro 4. Diagnostics: Q-Code 10; Q-LED/debug LED/EZ Debug 7.5; Clear CMOS/DualBIOS 7; otro 3. Convenience: q-release/ez-latch/ez M.2/M.2 clip/shield frozr 10; clear CMOS/auto driver/multi-key/tool-less 7; otro 3. Tuning: dynamic OC/AI OC/AI cooling/PerfDrive/DIMM Flex/OC Switcher 10; core/memory boost/noise cancel 7; thermal design/passive chipset/VRM 6; otro 4.
- **Compatibilidad** = una decimal de `.55*socket+.25*RAM+.20*PCIe`. Socket AM5/LGA1851/LGA1700/AM4/desconocido = `10/8/4.8/4.2/3`. RAM DDR5 usa `I(MHz;(6000,6),(6800,7),(7600,8),(8000,8.7),(8400,9.2),(8800,9.7),(9200,10))`; DDR4 usa `(3200,4),(4600,5.5),(5100,6.3),(5400,6.7)`; sin MHz, 5. PCIe es el promedio de principal GPU y mejor M.2, cada uno Gen5/4/3/otro = `10/7.5/5/3`.

**Calidad precio placa**: `u=.22*Estabilidad+.19*Expansión+.16*Conectividad+.13*Tecnologías+.30*Compatibilidad`; `longevity=.75+.25*(Compatibilidad/10)`; `fairPrice=180*(((u/10)*longevity)/.75)^(1/.68)`; nota estándar.

### PSU

Las anclas de ripple son `(8,10),(10,9.8),(12,9.5),(15,9.1),(20,8.3),(30,7),(35,6.2),(40,5.4),(45,4.5),(50,3.5),(60,2.3),(80,1)`. Topología LLC+DC-DC / una de ellas / ninguna = `10/9/8`.

- **Estabilidad eléctrica** = una decimal de `.95*ripple+.05*topología`; sin dato de ripple, usar 6 y limitar a 7.
- **Conectividad** con inventario completo = una decimal de `10*(.34*diminishing(PCIe6+2,5)+.22*moderno+.15*min(EPS,2)/2+.07*diminishing(SATA,8)+.02*diminishing(Molex,4)+.20*modularidad)`, `diminishing(x,cap)=ln(1+min(x,cap))/ln(1+cap)`, moderno 1 con 12V-2x6, .85 con 12VHPWR, 0 sin ellos; modularidad full/semi/no = `1/.65/.25`. Si falta cualquier contador: `min(6,10*(.55*ATX+.45*modularidad))`, donde ATX 3.1/3.0/otro=`1/.85/.5`.
- **Protecciones**: sin lista, 5. Con lista: una decimal de `9.2*(18*OCP+16*OVP+16*UVP+16*OPP+16*SCP+18*OTP)/100 + .4*SIP + .4*NLO + .2*BOP`, donde cada presencia vale 1.
- **Construcción** = una decimal de `.20*ripple+.25*topología+.20*componentes+.20*(.6*ruido+.4*ventilador)+.15*garantía`; componentes premium 10 si condensadores japoneses o 105°C, si no 6.5; ventilador FDB/HDB/Silent Wings 9.5, semi-pasivo 9, estándar 7.5, otro 6.5; garantía 10/5 años/otra=`10/8/6.5`; ruido `I(dBA;(10,10),(12,9.7),(14,9.4),(15,9.2),(16,9),(18,8.6),(20,8.1),(24,7),(26,6.3),(28,5.7),(30,5.1),(32,4.6),(35,3.8),(45,2))`. Sin ruido usa 6.5; si ripple o ruido faltan, limitar total a 7.
- **Eficiencia** = una decimal de `.75*I(efficiency_load_50;(80,2.5),(82,3.5),(85,5),(87,6.2),(88,6.7),(90,8),(91,8.5),(92,9),(93,9.4),(95,10))+.25*certificación`; Titanium/Platinum/Gold/Silver/Bronze/White/desconocida = `10/9.4/8.3/7.1/6/4.5/5`. Sin medición usa 6 y limita a 7.5.

**Calidad precio PSU**: `u=.28*Estabilidad+.22*Protecciones+.20*Construcción+.18*Eficiencia+.12*Conectividad`. `referencePrice=I(wattage;(450,45),(500,55),(550,65),(650,75),(700,85),(750,110),(850,140),(1000,185),(1200,230),(1500,350))`; `midpoint=.75^(1/1.3)`; `fairPrice=referencePrice*((u/10)/midpoint)^(1/.65)`; nota estándar.

## Tabla de especificaciones

Usar estas claves por tipo (el orden es visual):

| Tipo | Claves |
| --- | --- |
| CPU | `architecture,socket,cores,efficency_cores,threads,base_frequency,turbo_frequency,tdp,power_turbo_max,cache.l3,ram_type,ram_frecuency,ram_max_support,pcie,chipsets,cinebench_multi,geekbench_single,passmark_score` |
| GPU | `architecture,vram_capacity,vram_type,bus_width,cuda_cores_stream_processors,tflops_fp32,core_clock,boost_clock,tdp,pcie_generation,power_connectors,support_display,max_resolution,directx,1080p_gaming_avg_fps,1440p_gaming_avg_fps,4k_gaming_avg_fps,ray_tracing_performance,3dmark_time_spy,3dmark_time_spy_extreme,3dmark_port_royal,3dmark_speed_way,blender_score` |
| RAM | `capacity,dual_channel,technology,speed,latency,voltage,profile_support,has_dram_cache,ecc_support,overclocking_headroom,read_speed,write_speed,latency_ns` |
| STORAGE | `capacity,form_factor,pcie_generation,nand_type,tbw,energy_per_gb,read_speed,write_speed,crystal_disk_read,crystal_disk_write,max_temp_c` |
| MOTHERBOARD | `form_factor,socket,chipsets,power_phases,vrm_phases,vrm_quality_rating,pcie_generation,pcie_slots,m2_slots,ram_support,ethernet,wifi,audio_codec,usb_ports.usb_3,usb_ports.usb_c,usb_ports.usb_2,bios_features,vrm_thermal_performance,boot_time_seconds` |
| PSU | `wattage,efficiency,modular_type,form_factor,gpu_support,protections,ripple_mv,efficiency_load_50,noise_level_db` |

Aplicar únicamente formato de unidades: GHz (`base_frequency`, `turbo_frequency`), W (`tdp`, `power_turbo_max`, `wattage`), GB (capacidad/VRAM/RAM máxima), MHz (frecuencias), MB/s (storage), `PCIe Gen n`, arrays unidos por ` · ` y caché L3 como `valorKB/1024` MB. Si falta un valor, mostrar `No`.

## Archivos de referencia del proyecto actual

- Orquestador: `src/lib/scoring/components/index.ts`.
- CPU/GPU/RAM/storage/placa/PSU: `src/lib/scoring/components/calculations/`.
- Curvas de calidad/precio: `src/lib/scoring/components/calculations/value-curve.ts`.
- Comparador: `src/app/(main)/comparator/[[...slugs]]/components/`.
- Tabla y sus claves: `src/lib/config/specs-mapping.ts`.
- Moneda: `src/lib/currency.ts` y `src/lib/serverCurrency.ts`.
