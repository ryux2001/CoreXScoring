# Plan de accion de seguridad 1

Fecha: 2026-09-12

## Objetivo

Reducir los riesgos detectados en la auditoria de seguridad de CoreXScoring, con prioridad en vulnerabilidades de dependencias, abuso y coste del asistente de IA, autenticacion y autorizacion de datos en Supabase.

Este documento es un plan de trabajo. Su creacion no implica que las vulnerabilidades esten corregidas.

## Progreso de implementacion

Actualizado el 2026-09-13. SEC-005, SEC-006, SEC-007 y SEC-008 tienen implementación técnica y evidencia local documentadas en `docs/etapas-5-6.md`. El cierre formal sigue condicionado a configurar el entorno de producción, ejecutar una prueba dinámica autorizada y completar Etapa 13.

## Criterio de prioridad

| Prioridad | Plazo recomendado | Criterio |
| --- | --- | --- |
| P0 | Antes de cualquier despliegue publico | Riesgo critico, perdida de control de acceso, ejecucion remota o gasto significativo |
| P1 | Inmediatamente despues de P0 | Explotacion probable con impacto alto o encadenable con otros fallos |
| P2 | Antes de declarar el producto estable | Reduccion de superficie de ataque y defensa en profundidad |
| P3 | Mantenimiento continuo | Automatizacion, observabilidad y prevencion de regresiones |

## Reglas de ejecucion

- Crear una rama dedicada para las correcciones de seguridad.
- No mezclar cambios funcionales o visuales con este trabajo.
- Implementar una sola etapa de ejecucion por turno, pull request o sesion de agente.
- Leer el resultado y la evidencia de la etapa anterior antes de comenzar la siguiente.
- No copiar secretos en incidencias, commits, logs o capturas.
- Aplicar primero los cambios en un entorno Supabase de pruebas.
- Probar cada migracion con usuarios anonimo, autenticado, administrador y service role.
- Mantener autorizacion dentro de rutas y operaciones de datos; no depender solo de `src/proxy.ts`.
- No cerrar un punto hasta cumplir sus criterios de aceptacion.
- No avanzar de etapa si existe una regresion funcional sin resolver.
- Si una correccion cambia contratos de API o datos persistidos, preparar migracion y rollback antes del despliegue.

## Contrato de preservacion funcional

El objetivo de este plan es corregir vulnerabilidades sin cambiar la funcionalidad legitima, el diseño visual ni los flujos de negocio de la web. Cada implementador debe realizar el cambio minimo necesario y conservar los contratos existentes, salvo los comportamientos inseguros que este documento ordena bloquear expresamente.

La implementacion debe preservar:

- Navegacion publica, pagina principal, catalogo, filtros, busqueda, paginacion y fichas de producto.
- Visualizacion de combos y builds publicas.
- Comparador: agregar, quitar, reemplazar y comparar productos; precios manuales y navegacion por URL.
- Autenticacion: registro, confirmacion de email, inicio y cierre de sesion, recuperacion de contraseña y gestion de cuenta.
- Boveda: guardar y eliminar favoritos, crear y editar combos/builds, consultar elementos propios y administrar precios personalizados.
- IA para invitados y usuarios registrados: chat temporal, conversaciones guardadas, contexto de pagina, consultas de catalogo y acciones confirmadas.
- Proveedores de IA existentes: proveedor local, claves del servidor y BYOK, siempre que esten configurados y autorizados.
- Paneles administrativos, orden del catalogo, contenido de inicio, metricas y monitorizacion para administradores.
- Aspecto visual, textos, responsive design y accesibilidad, salvo mensajes de seguridad necesarios.
- Formatos de respuesta y contratos de API utilizados por la interfaz, salvo que el cambio de seguridad exija versionarlos de forma explicita.

Cambios funcionales intencionales permitidos:

- Rechazar accesos, escrituras o lecturas no autorizadas.
- Impedir que cuentas anonimas persistan datos reservados a cuentas permanentes.
- Rechazar cuerpos excesivos, origenes no confiables, redirects externos y entradas manipuladas.
- Exigir reautenticacion, prueba recovery o MFA en operaciones sensibles.
- Detener llamadas de IA al alcanzar cuotas, presupuesto o limites de concurrencia.
- Restringir tools de IA cuando no exista intencion legitima o autorizacion.
- Invalidar sesiones antiguas despues de cambios sensibles cuando la politica lo requiera.

No se consideran correcciones aceptables:

- Desactivar completamente el comparador, la boveda, la IA o la autenticacion para evitar implementar controles adecuados.
- Eliminar un proveedor de IA como sustituto de corregir autorizacion, cuotas o validacion.
- Mover toda operacion al servidor sin conservar el comportamiento observable y los estados de error/carga necesarios.
- Cambiar modelos de datos, rutas, URLs, textos o componentes visuales sin una necesidad de seguridad documentada.
- Introducir fallbacks que vuelvan a permitir el comportamiento vulnerable.

## Regla de regresion

Antes de modificar nada, cada etapa debe identificar sus flujos afectados y dejar una evidencia de comportamiento base. Despues del cambio debe repetir esas pruebas y demostrar que:

1. El flujo legitimo sigue funcionando.
2. El caso malicioso o no autorizado queda bloqueado.
3. No se amplian permisos de ningun rol.
4. No se exponen secretos ni datos de otro usuario.
5. Build, lint y pruebas aplicables terminan correctamente.

Si una prueba funcional previa falla antes de comenzar, debe registrarse como incidencia preexistente. No debe ocultarse ni corregirse dentro de una etapa de seguridad no relacionada.

## Fase 0: Contencion inmediata

### SEC-001: Actualizar Next.js y dependencias vulnerables

**Prioridad:** P0  
**Riesgo actual:** Critico condicionado al entorno  
**Referencias:** `package.json:27`, `package.json:42`, `pnpm-lock.yaml`

Acciones:

1. Actualizar `next` y `eslint-config-next` a la ultima version estable que corrija todos los avisos aplicables; no usar una version inferior a `16.3.3` segun la auditoria del 2026-09-12.
2. Regenerar el lockfile mediante pnpm sin introducir gestores de paquetes alternativos.
3. Revisar las versiones transitivas de `sharp`, `postcss`, `nanoid`, Babel, `browserslist` y `baseline-browser-mapping`.
4. Ejecutar build, lint, pruebas de IA y una nueva auditoria de dependencias.
5. Probar App Router, `src/proxy.ts`, Server Components y optimizacion de imagenes.
6. Hasta desplegar la correccion, evitar habilitar AVIF y limitar en CDN/WAF las rutas de imagenes y las solicitudes anormalmente costosas.

Criterios de aceptacion:

- `pnpm audit --prod` no muestra vulnerabilidades criticas ni altas explotables en produccion.
- `pnpm build`, `pnpm lint` y `pnpm test:ai` terminan correctamente.
- Las rutas privadas siguen rechazando usuarios sin autorizacion incluso si el proxy no interviene.
- Se documenta cualquier aviso residual, su condicion de explotacion y la mitigacion aplicada.

Rollback:

- Conservar el lockfile anterior solo como referencia de comparacion.
- Si aparece una regresion, corregirla sobre la version parcheada; no volver a una version con RCE o bypass conocido en produccion.

### SEC-002: Proteger y rotar secretos

**Prioridad:** P0  
**Riesgo actual:** Alto si las credenciales son reales o compartidas con produccion  
**Referencias:** `.env.local`, `.gitignore:35-37`

Acciones:

1. Determinar, sin registrar valores, si las credenciales de `.env.local` pertenecen a desarrollo o produccion.
2. Rotar la clave privilegiada de Supabase, claves de proveedores de IA y secreto de cifrado BYOK si han sido compartidos, respaldados fuera de un almacen seguro o usados en produccion.
3. Cambiar los permisos locales de archivos de secretos a `0600`.
4. Configurar secretos de produccion en el gestor de secretos de la plataforma.
5. Separar por finalidad `AI_ACTION_SECRET`, `AI_IP_HASH_SECRET` y `AI_PROVIDER_KEYS_ENCRYPTION_SECRET`, sin fallbacks a claves de Supabase o proveedores.
6. Definir versionado y procedimiento de rotacion para el cifrado BYOK antes de cambiar una clave que ya proteja datos persistidos.
7. Ejecutar secret scanning sobre historial Git, artefactos de CI, backups y `.playwright-mcp/`.

Criterios de aceptacion:

- Ningun secreto de produccion reside en el workspace o en archivos con permisos de grupo/otros.
- Cada funcion criptografica usa un secreto aleatorio e independiente.
- Produccion falla de forma segura al arrancar si falta un secreto obligatorio.
- Las claves antiguas quedan revocadas y la aplicacion funciona con las nuevas.
- No se pierden claves BYOK existentes durante la rotacion.

### SEC-003: Verificar y versionar RLS del dominio principal

**Prioridad:** P0  
**Riesgo actual:** Potencialmente critico; no verificable desde el repositorio  
**Tablas:** `saved_products`, `saved_combos`, `saved_builds`, `created_combos`, `created_builds`, `products`, `combos`, `builds`, `games`

Acciones:

1. Exportar de forma segura el esquema, grants, constraints y politicas efectivamente desplegados en Supabase.
2. Compararlos con las operaciones realizadas por navegador, Server Components y rutas API.
3. Incorporar al repositorio migraciones reproducibles para el esquema y todas las politicas RLS faltantes.
4. En tablas privadas, exigir `auth.uid() = user_id` tanto en `USING` como en `WITH CHECK`.
5. Impedir que el cliente atribuya filas a otro usuario mediante defaults o funciones controladas cuando sea viable.
6. Excluir JWT anonimos de la boveda si el producto no permite persistencia anonima.
7. Revocar grants innecesarios a `anon` y `authenticated`.
8. Agregar restricciones de claves foraneas, unicidad, longitudes, precios finitos y no negativos, tipos de componente y propiedad inmutable.
9. Revisar vistas y funciones para evitar `security_definer` accidental o `search_path` inseguro.

Pruebas obligatorias:

1. Usuario A no puede leer, insertar, actualizar ni eliminar filas del usuario B.
2. Usuario B no puede cambiar `user_id` para apropiarse de una fila.
3. Un usuario anonimo no puede escribir en la boveda.
4. Un usuario permanente solo puede operar sobre sus filas.
5. Un administrador solo obtiene permisos adicionales en operaciones expresamente administrativas.
6. El rol `anon` conserva acceso de solo lectura exclusivamente a datos publicos previstos.
7. La service role no se utiliza desde el navegador.

Criterios de aceptacion:

- El estado remoto puede reconstruirse completamente desde las migraciones versionadas.
- Las pruebas de aislamiento con al menos dos usuarios y una sesion anonima son automatizadas y exitosas.
- La revision confirma que ningun filtro del cliente se considera sustituto de RLS.

## Fase 1: Abuso, limites y costes de IA

### SEC-004: Cerrar el bypass de liquidacion de cuota

**Prioridad:** P0  
**Riesgo actual:** Alto  
**Referencias:** `supabase/migrations/20260822140000_ai_quota_settlement.sql:3-43`, `src/lib/ai/limits.ts:191-219`

Acciones:

1. Revocar `EXECUTE` de `settle_ai_quota` a `authenticated`, `anon` y `public`.
2. Restringir consumo y liquidacion de cuotas a un backend confiable o rol dedicado.
3. Reemplazar cantidades libres por una reserva persistida con ID aleatorio generado por servidor.
4. Asociar cada reserva a usuario, huella de red, fecha, cantidad maxima, request ID, estado y caducidad.
5. Permitir una unica liquidacion por reserva mediante operacion atomica.
6. No aceptar del navegador `p_reserved_tokens`, `p_actual_tokens`, `p_ip_hash` ni `p_is_anonymous` como valores de confianza.
7. Investigar y, si corresponde, corregir contadores ya manipulados.

Pruebas obligatorias:

1. Un JWT autenticado no puede invocar directamente liquidacion o reserva interna.
2. Una reserva no puede liquidarse dos veces.
3. Un usuario no puede liquidar una reserva ajena.
4. Cantidades distintas de la reserva almacenada son rechazadas.
5. Errores y timeouts conservan o liquidan correctamente el consumo acumulado.
6. Dos solicitudes concurrentes no pueden exceder la cuota mediante carrera.

Criterios de aceptacion:

- Es imposible reducir contadores enviando una reserva inexistente.
- Todas las transiciones de cuota son atomicas, auditables e idempotentes.

### SEC-005: Implementar presupuesto real y limites globales de IA

**Prioridad:** P1  
**Riesgo actual:** Alto  
**Referencias:** `src/lib/ai/limits.ts:7-9`, `src/lib/ai/limits.ts:83-85`, `src/app/api/ai/chat/route.ts:413-498`, `src/lib/ai/gateway.ts:522-551`

Acciones:

1. Estimar el presupuesto con mensajes, prompt de sistema, politicas, schemas de tools, contexto de pagina y maximo de rondas.
2. Acumular uso tras cada llamada al proveedor, incluso cuando la conversacion termine en error.
3. Definir maximos por solicitud, minuto, dia, usuario, IP, proveedor y modelo.
4. Definir presupuesto monetario diario y mensual con corte automatico.
5. Configurar hard caps tambien en Groq, OpenRouter, Cerebras y cualquier proveedor futuro.
6. Limitar concurrencia global y por usuario.
7. Implementar circuit breaker por coste, errores consecutivos y latencia.
8. Cancelar inferencias cuando el cliente se desconecte, si el proveedor lo permite.
9. Reducir tools y politicas enviadas segun una intencion determinada en servidor.
10. Crear alertas por crecimiento anormal de cuentas anonimas, tokens, rondas, errores y coste.

Criterios de aceptacion:

- Ninguna solicitud puede superar el coste maximo definido sin interrupcion.
- El consumo de rondas fallidas queda contabilizado.
- Alcanzar el presupuesto global detiene nuevas llamadas de pago sin afectar otras funciones del sitio.
- Existe un dashboard o alerta operativa que permita detectar abuso antes de agotar el presupuesto mensual.

### SEC-006: Endurecer identidad de red y sesiones anonimas

**Prioridad:** P1  
**Riesgo actual:** Medio, encadenable con abuso economico  
**Referencias:** `src/lib/ai/limits.ts:55-80`, `src/lib/ai/client-session.ts:12-30`

Acciones:

1. Identificar la cabecera de IP garantizada por el proveedor de despliegue.
2. Aceptar cabeceras reenviadas solo desde proxies confiables.
3. Documentar la cadena de proxies y seleccionar el salto correcto.
4. Aplicar CAPTCHA o challenge progresivo a creacion anonima y patrones anormales.
5. Limitar altas anonimas por red, dispositivo y ventana temporal.
6. Implementar limpieza de cuentas y datos anonimos expirados.
7. Evitar que una sesion anonima guarde favoritos o contenido de boveda tanto en UI como en RLS.

Criterios de aceptacion:

- Enviar un `X-Forwarded-For` arbitrario no cambia el bucket efectivo.
- Crear identidades anonimas de forma automatizada activa limites o challenge.
- Los JWT anonimos no pueden persistir contenido reservado a cuentas permanentes.

### SEC-007: Eliminar prompt injection de contexto privilegiado

**Prioridad:** P1  
**Riesgo actual:** Medio-alto  
**Referencias:** `src/lib/ai/gateway.ts:522-529`, `src/lib/ai/page-context.ts:95-156`, `src/lib/ai/types.ts:316-382`

Acciones:

1. Reconstruir `buildDraft` y `comboDraft` en servidor usando exclusivamente IDs validados.
2. Derivar ruta, tipo, ID, titulo y resumen de pagina desde pathname y base de datos.
3. Si una entidad no existe o no pertenece al usuario, eliminar todos sus metadatos en lugar de conservar fallbacks del cliente.
4. No interpolar nombres, titulos, tags o descripciones no confiables dentro del mensaje de sistema.
5. Entregar esos datos como estructura delimitada o resultado de tool marcado como no confiable.
6. Separar tools publicas y privadas.
7. Exponer busquedas de boveda solo cuando exista intencion explicita determinada en servidor.
8. Minimizar campos privados enviados a proveedores externos.
9. Crear pruebas adversariales con instrucciones incrustadas en nombres, titulos, descripciones, tags, borradores y resultados de catalogo.

Criterios de aceptacion:

- Ningun campo controlado por cliente o catalogo obtiene autoridad de mensaje `system`.
- Una inyeccion en datos recuperados no puede habilitar tools privadas.
- Las tools de escritura siguen requiriendo confirmacion y autorizacion determinista.

### SEC-008: Proteger acciones pendientes y telemetria

**Prioridad:** P1  
**Riesgo actual:** Medio  
**Referencias:** `supabase/migrations/20260823110000_ai_pending_actions.sql:25-105`, `src/lib/ai/actions.ts:326-343`, `src/lib/ai/actions.ts:912-953`

Acciones:

1. Revocar al rol `authenticated` la creacion directa de acciones pendientes y telemetria interna.
2. Crear acciones solo desde backend confiable.
3. Recalcular el HMAC del payload al confirmar y compararlo de forma segura.
4. Asociar la accion a un request ID emitido por servidor.
5. Limitar acciones pendientes activas por usuario.
6. Limpiar periodicamente acciones expiradas y telemetria antigua.
7. Mantener revalidacion de ownership, componentes, compatibilidad, precios y tipos en la ejecucion final.

Criterios de aceptacion:

- Un cliente no puede fabricar una accion valida llamando directamente a PostgREST.
- Alterar payload, digest, propietario o expiracion invalida la confirmacion.
- Una accion consumida no puede reutilizarse bajo concurrencia.

## Fase 2: Autenticacion y operaciones sensibles

### SEC-009: Separar recuperacion y cambio normal de contraseña

**Prioridad:** P0  
**Riesgo actual:** Alto  
**Referencias:** `src/proxy.ts:48-63`, `src/app/auth/confirm/route.ts:21-68`, `src/app/auth/update-password/page.tsx:5-26`, `src/app/auth/components/PasswordChangeForm.tsx:25-59`

Acciones:

1. Diferenciar el cambio autenticado de la recuperacion por correo.
2. Tras validar un callback de tipo recovery, emitir una prueba server-side corta, firmada, `HttpOnly`, `Secure`, `SameSite=Strict` y de un solo uso.
3. Exigir esa prueba para entrar y enviar `/auth/update-password`.
4. Rechazar sesiones normales en la ruta de recuperacion.
5. Para cambios desde la cuenta, usar la reautenticacion oficial de Supabase, sesion reciente, nonce o MFA segun la configuracion disponible.
6. No asumir que enviar un campo `current_password` adicional a `updateUser` constituye reautenticacion.
7. Revocar las demas sesiones despues de cambiar la contraseña.
8. Registrar el evento sin almacenar contraseñas, tokens o enlaces de recuperacion.

Pruebas obligatorias:

1. Una sesion normal no puede abrir ni enviar el formulario de recuperacion.
2. Un enlace recovery valido permite un unico cambio dentro de su TTL.
3. Reutilizar el enlace o prueba falla.
4. Un usuario no puede cambiar contraseña desde la cuenta con una contraseña actual incorrecta.
5. Tras el cambio, sesiones antiguas dejan de ser validas conforme a la politica definida.

Criterios de aceptacion:

- Una sesion robada por si sola no permite convertir acceso temporal en una nueva contraseña.
- Recuperacion y cambio autenticado tienen pruebas independientes y auditables.

### SEC-010: Corregir redireccion abierta del callback

**Prioridad:** P1  
**Riesgo actual:** Medio  
**Referencia:** `src/app/auth/confirm/route.ts:6-27`

Acciones:

1. Sustituir destinos arbitrarios por una allowlist de rutas internas necesarias.
2. Rechazar barras invertidas, caracteres de control y codificaciones ambiguas.
3. Construir y normalizar el destino antes de comparar.
4. Exigir que `target.origin` coincida exactamente con el origin canonico de la aplicacion.
5. Agregar pruebas para `/\\evil.example`, `//evil.example`, URLs codificadas, rutas validas y destinos desconocidos.

Criterios de aceptacion:

- Ningun valor de `next` puede producir navegacion a un origin externo.
- Confirmacion y recuperacion conservan sus destinos internos previstos.

### SEC-011: Reautenticar eliminacion de cuenta

**Prioridad:** P1  
**Riesgo actual:** Medio  
**Referencia:** `src/app/api/account/delete/route.ts:8-94`

Acciones:

1. Exigir sesion reciente y reautenticacion oficial o MFA antes de eliminar.
2. Mantener la confirmacion textual solo como proteccion contra errores de interfaz.
3. Autenticar antes de parsear el cuerpo.
4. Exigir JSON y un cuerpo de tamaño reducido.
5. Aplicar rate limit por usuario e IP.
6. Confirmar el comportamiento de cierre y revocacion de sesiones.
7. Verificar eliminacion o anonimizacion de datos relacionados segun politica de privacidad.

Criterios de aceptacion:

- Una sesion antigua o robada no basta para eliminar la cuenta.
- La operacion es idempotente, no filtra errores internos y deja las sesiones invalidadas.

### SEC-012: Uniformar proteccion CSRF

**Prioridad:** P2  
**Riesgo actual:** Bajo-medio  
**Referencias:** rutas mutadoras bajo `src/app/api/`

Acciones:

1. Centralizar comprobacion de `Origin`, host canonico, `Sec-Fetch-Site` y tipo de contenido.
2. Para metodos mutadores, rechazar `Origin` ausente salvo excepcion documentada.
3. Evaluar token CSRF para operaciones destructivas.
4. Confirmar cookies `Secure`, `HttpOnly` cuando corresponda y `SameSite=Lax` o `Strict` en produccion.
5. Probar solicitudes cross-site, `Origin: null`, formularios HTML y clientes validos.

Criterios de aceptacion:

- Todas las rutas mutadoras aplican la misma politica.
- Las acciones destructivas no pueden iniciarse desde otro sitio mediante cookies de sesion.

## Fase 3: Endurecimiento de APIs, navegador y privacidad

### SEC-013: Limitar cuerpos y frecuencia de APIs

**Prioridad:** P1  
**Riesgo actual:** Medio  
**Referencias:** `src/app/api/ai/chat/route.ts:105-128`, `src/app/api/account/delete/route.ts:8-25`, rutas administrativas y BYOK

Acciones:

1. Autenticar antes de leer cuerpos cuando el endpoint lo permita.
2. Rechazar `Content-Length` superior al maximo por endpoint.
3. Configurar limites equivalentes en CDN o reverse proxy.
4. Leer streams con contador cuando no se pueda confiar en `Content-Length`.
5. Usar esquemas estrictos que rechacen propiedades desconocidas, profundidad excesiva, arrays grandes y cadenas fuera de limite.
6. Aplicar rate limiting a chat, test de proveedores, auth, eliminacion de cuenta y administracion.
7. Responder con `Cache-Control: no-store` en endpoints sensibles.

Criterios de aceptacion:

- Un cuerpo sobredimensionado se rechaza antes de parsearse completamente.
- Pruebas concurrentes controladas no provocan crecimiento no acotado de memoria.

### SEC-014: Agregar cabeceras globales de seguridad

**Prioridad:** P2  
**Riesgo actual:** Medio como defensa en profundidad  
**Referencia:** `next.config.ts:3-6`

Acciones:

1. Desactivar `X-Powered-By`.
2. Definir CSP inicial en modo report-only y recopilar violaciones legitimas.
3. Pasar a CSP aplicada con `default-src 'self'`, `object-src 'none'`, `base-uri 'self'` y `frame-ancestors 'none'`.
4. Restringir `script-src`, `style-src`, `img-src`, `font-src` y `connect-src` a origenes necesarios.
5. Preferir nonce o hashes frente a `unsafe-inline`.
6. Agregar `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` y HSTS en produccion HTTPS.
7. Evaluar COOP, CORP y COEP segun integraciones.

Criterios de aceptacion:

- La aplicacion, Supabase, fuentes, imagenes e IA funcionan con CSP aplicada.
- El sitio no puede embeberse en un frame externo no autorizado.
- No existen violaciones CSP recurrentes sin justificar.

### SEC-015: Validar salidas y privacidad del asistente

**Prioridad:** P2  
**Riesgo actual:** Medio  
**Referencias:** `src/lib/ai/gateway.ts:479-487`, `src/ui/ai/AISidebar.tsx`, almacenamiento de conversaciones

Acciones:

1. Restringir enlaces generados a rutas internas y dominios permitidos.
2. Mostrar confirmacion o advertencia antes de abrir enlaces externos.
3. Aplicar deteccion de secretos y datos sensibles antes de enviar y mostrar contenido.
4. Minimizar datos de boveda incluidos en resultados de tools.
5. Informar al usuario del proveedor efectivo, retencion y transferencia de datos.
6. Publicar una politica de privacidad real; sustituir enlaces placeholder.
7. Permitir eliminar conversaciones y definir retencion automatica.
8. Evaluar cifrado de conversaciones sensibles en reposo.
9. Evitar registrar mensajes completos o errores del proveedor que puedan reflejar prompts.

Criterios de aceptacion:

- El usuario conoce cuando sus datos salen a un proveedor externo.
- La respuesta no convierte enlaces arbitrarios del modelo en navegacion confiable sin advertencia.
- Existe una politica probada de borrado y retencion de conversaciones.

### SEC-016: Reducir filtracion accidental de datos

**Prioridad:** P2  
**Riesgo actual:** Bajo  
**Referencias:** consultas `.select('*')`, errores mostrados al cliente, `.playwright-mcp/`

Acciones:

1. Sustituir `select('*')` por listas de columnas explicitas en datos privados o enviados a IA.
2. Definir DTO separados para cliente, administracion y proveedores de IA.
3. Devolver errores genericos al usuario y conservar solo codigos seguros en logs.
4. Excluir `.playwright-mcp/` y artefactos de navegador salvo fixtures sanitizados deliberadamente.
5. Revisar y retirar artefactos versionados que puedan contener datos de prueba sensibles.
6. Aplicar retencion a logs y tratar hashes de IP como datos pseudonimos.

Criterios de aceptacion:

- Agregar una columna sensible a una tabla no la expone automaticamente.
- Ningun artefacto de pruebas contiene sesiones, correos, conversaciones o datos administrativos reales.

## Fase 4: Automatizacion y control continuo

### SEC-017: Crear una canalizacion de seguridad en CI

**Prioridad:** P3  
**Riesgo actual:** Prevencion insuficiente de regresiones

Acciones:

1. Ejecutar instalacion congelada, lint, build y pruebas en cada pull request.
2. Ejecutar `pnpm audit --prod` con politica de bloqueo para vulnerabilidades criticas y altas explotables.
3. Activar Dependabot o Renovate con revision de cambios del lockfile.
4. Agregar secret scanning y SAST.
5. Revisar licencias y scripts de instalacion de nuevas dependencias.
6. Crear pruebas RLS automatizadas contra un Supabase efimero o entorno aislado.
7. Agregar pruebas adversariales de IA, cuotas, callbacks, CSRF y operaciones destructivas.

Criterios de aceptacion:

- Una regresion conocida de auth, RLS, cuota o redirect bloquea el merge.
- Una dependencia critica nueva genera alerta y responsable asignado.
- Los resultados de seguridad quedan disponibles sin incluir secretos.

### SEC-018: Preparar observabilidad y respuesta a incidentes

**Prioridad:** P3  
**Riesgo actual:** Deteccion y contencion tardias

Acciones:

1. Definir alertas para gasto de IA, creacion anonima, 401/403/429, errores de proveedor y acciones administrativas.
2. Definir runbooks para clave filtrada, abuso de IA, acceso a cuenta, fallo RLS y dependencia critica.
3. Mantener inventario de secretos, propietarios, proveedores y fechas de rotacion.
4. Establecer retencion minima necesaria para telemetria y logs.
5. Probar periodicamente restauracion, revocacion de claves y corte de proveedores.

Criterios de aceptacion:

- Cada alerta critica tiene responsable, umbral y accion de contencion.
- Es posible desactivar IA o un proveedor sin desplegar codigo nuevo.
- Existe un procedimiento ensayado para rotar credenciales y notificar incidentes.

## Etapas de ejecucion delegables

Las fases anteriores agrupan riesgos por tema. Las siguientes etapas definen el orden operativo para implementar el plan con un agente o modelo de contexto reducido. Cada etapa debe tratarse como una tarea independiente y terminar con un resumen de entrega.

No se debe pedir a un implementador que complete varias etapas a la vez. Si una etapa resulta demasiado grande, se divide por el orden de sus subtareas sin mezclar archivos o riesgos de etapas posteriores.

### Etapa 0: Linea base y entorno seguro

**Incluye:** preparacion; no corrige todavia un SEC concreto.  
**Dependencias:** ninguna.  
**Objetivo:** disponer de una referencia funcional y un entorno donde las correcciones no afecten datos reales.

Tareas:

1. Registrar versiones de Node, pnpm, Next.js y Supabase CLI utilizadas.
2. Ejecutar y registrar `pnpm lint`, `pnpm build` y `pnpm test:ai` sin aplicar fixes automaticos.
3. Preparar una lista manual de smoke tests para home, catalogo, comparador, auth, boveda, IA y administracion.
4. Crear o identificar un proyecto Supabase aislado con datos de prueba.
5. Preparar usuarios de prueba: anonimo, usuario A, usuario B y administrador.
6. Registrar fallos preexistentes por separado.

Salida obligatoria:

- Informe de linea base con comandos, resultados y flujos manuales comprobados.
- Confirmacion de que ninguna prueba posterior usara secretos o datos de produccion.

No avanzar si:

- No existe un entorno Supabase de pruebas.
- No se puede diferenciar una regresion nueva de un fallo preexistente.

### Etapa 1: Dependencias y framework

**Incluye:** SEC-001.  
**Dependencias:** Etapa 0.  
**Objetivo:** eliminar vulnerabilidades conocidas del framework sin alterar rutas o renderizado.

Tareas:

1. Actualizar exclusivamente Next.js, su configuracion asociada y transitivas necesarias.
2. Revisar el lockfile para detectar paquetes inesperados o scripts nuevos.
3. Repetir auditoria, lint, build y pruebas.
4. Ejecutar smoke tests de navegacion, Server Components, proxy e imagenes.
5. Comprobar expresamente que catalogo y comparador conservan su comportamiento.

Salida obligatoria:

- Diff limitado a dependencias y ajustes indispensables de compatibilidad.
- Resultado comparado de `pnpm audit --prod` antes y despues.
- Evidencia de que catalogo, comparador, auth e IA cargan correctamente.

No avanzar si:

- Persisten vulnerabilidades criticas aplicables sin mitigacion documentada.
- El comparador, las rutas privadas o la optimizacion de imagenes sufren regresiones.

### Etapa 2: Secretos y configuracion criptografica

**Incluye:** SEC-002.  
**Dependencias:** Etapa 0; puede ejecutarse en paralelo operativo con Etapa 1, pero debe entregarse por separado.  
**Objetivo:** separar, proteger y rotar secretos sin perder claves BYOK ni acceso a proveedores.

Tareas:

1. Inventariar nombres, propietarios y entornos de secretos sin mostrar valores.
2. Preparar secretos independientes para acciones, hash de IP y cifrado BYOK.
3. Implementar validacion segura de configuracion sin fallbacks entre dominios.
4. Diseñar y probar la rotacion BYOK antes de rotar una clave ya utilizada.
5. Rotar credenciales expuestas y configurar el gestor de secretos.
6. Ejecutar secret scanning.

Salida obligatoria:

- Inventario sin valores sensibles.
- Evidencia de rotacion y revocacion.
- Prueba de lectura de credenciales BYOK existentes y de conexion a cada proveedor habilitado.

No avanzar si:

- Una rotacion puede dejar datos BYOK irrecuperables.
- La IA deja de funcionar con proveedores validos.

### Etapa 3: Esquema y aislamiento RLS

**Incluye:** SEC-003.  
**Dependencias:** Etapa 0.  
**Objetivo:** hacer reproducible y demostrable el aislamiento de datos sin romper la boveda.

Subetapas recomendadas:

1. Etapa 3A: exportar y comparar esquema, grants, constraints y politicas remotas.
2. Etapa 3B: versionar esquema base y politicas sin cambiar aun permisos efectivos.
3. Etapa 3C: endurecer RLS y grants en el entorno de pruebas.
4. Etapa 3D: agregar constraints y pruebas multiusuario.
5. Etapa 3E: probar todas las operaciones legitimas de boveda y administracion.

Salida obligatoria:

- Migraciones reproducibles.
- Matriz de permisos por tabla y rol.
- Pruebas automatizadas usuario A contra usuario B, anonimo y administrador.
- Smoke test completo de favoritos, combos/builds creados y precios personalizados.

No avanzar si:

- Una escritura legitima de boveda deja de funcionar.
- Un usuario puede leer o modificar datos ajenos.
- El estado remoto no puede reconstruirse desde migraciones.

### Etapa 4: Integridad de cuotas de IA

**Incluye:** SEC-004.  
**Dependencias:** Etapas 0 y 3.  
**Objetivo:** impedir manipulacion directa de cuotas manteniendo el chat operativo.

Subetapas recomendadas:

1. Etapa 4A: diseñar reserva identificada, estados y transiciones atomicas.
2. Etapa 4B: migrar RPC y revocar permisos directos.
3. Etapa 4C: adaptar la ruta server-side de chat.
4. Etapa 4D: probar errores, reintentos, carreras y liquidacion unica.

Salida obligatoria:

- Diagrama breve de estados de una reserva.
- Pruebas negativas con JWT de usuario contra las RPC internas.
- Prueba positiva de chat anonimo y autenticado dentro de cuota.
- Prueba de respuesta 429 al superar la cuota.

No avanzar si:

- El cliente puede reducir contadores directamente.
- El chat legitimo deja reservas bloqueadas de manera habitual.
- Se pierde la diferenciacion entre invitado y usuario registrado.

### Etapa 5: Presupuesto, concurrencia e identidad de red

**Incluye:** SEC-005 y SEC-006.  
**Dependencias:** Etapa 4.  
**Objetivo:** limitar coste y automatizacion abusiva sin eliminar el modo invitado.

Subetapas recomendadas:

1. Etapa 5A: contabilizar prompt completo, tools y uso por ronda.
2. Etapa 5B: agregar limites por solicitud, usuario, IP, proveedor y globales.
3. Etapa 5C: configurar hard caps y circuit breakers.
4. Etapa 5D: obtener IP solo desde infraestructura confiable.
5. Etapa 5E: limitar abuso de sesiones anonimas y limpiar datos expirados.

Salida obligatoria:

- Tabla de limites y motivo de cada valor.
- Pruebas de rondas exitosas, fallidas, timeout y desconexion.
- Prueba de spoofing de `X-Forwarded-For`.
- Evidencia de que un invitado legitimo puede seguir usando la IA.
- Evidencia de corte al alcanzar presupuesto sin afectar catalogo o comparador.

No avanzar si:

- Existe una ruta para generar coste no contabilizado.
- Se desactiva por completo el acceso invitado sin decision de producto aprobada.

### Etapa 6: Contexto, tools y acciones de IA

**Incluye:** SEC-007 y SEC-008.  
**Dependencias:** Etapas 3, 4 y 5.  
**Objetivo:** evitar prompt injection y acciones fabricadas conservando consultas y acciones legitimas.

Subetapas recomendadas:

1. Etapa 6A: reconstruir contexto y borradores desde datos validados.
2. Etapa 6B: separar datos no confiables del mensaje de sistema.
3. Etapa 6C: seleccionar tools publicas/privadas mediante intencion server-side.
4. Etapa 6D: proteger creacion, firma, consumo y limpieza de acciones pendientes.
5. Etapa 6E: restringir telemetria interna.
6. Etapa 6F: ejecutar suite adversarial.

Salida obligatoria:

- Matriz de tools por tipo de usuario e intencion.
- Casos adversariales con instrucciones en nombres, titulos, contexto y resultados.
- Prueba positiva de consultas de catalogo, boveda y acciones confirmadas.
- Prueba de que modificar payload o digest invalida una accion.

No avanzar si:

- La IA pierde la capacidad legitima de consultar catalogo o boveda autorizada.
- Una tool privada puede ejecutarse sin intencion y autorizacion.
- Guardar una build o combo confirmado deja de funcionar.

### Etapa 7: Recuperacion y cambio de contraseña

**Incluye:** SEC-009.  
**Dependencias:** Etapa 0.  
**Objetivo:** separar recuperacion y cambio autenticado sin bloquear el acceso legitimo.

Subetapas recomendadas:

1. Etapa 7A: definir prueba recovery, TTL y consumo unico.
2. Etapa 7B: adaptar callback y pagina de nueva contraseña.
3. Etapa 7C: implementar reautenticacion para cambio desde la cuenta.
4. Etapa 7D: definir revocacion de sesiones y pruebas de extremo a extremo.

Salida obligatoria:

- Diagrama de ambos flujos.
- Pruebas de enlace valido, expirado y reutilizado.
- Prueba de sesion normal intentando entrar al flujo recovery.
- Prueba de cambio normal con contraseña correcta e incorrecta.

No avanzar si:

- Un usuario legitimo no puede recuperar su cuenta.
- Una sesion normal puede usar el flujo recovery sin prueba adicional.

### Etapa 8: Callback y operaciones destructivas

**Incluye:** SEC-010 y SEC-011.  
**Dependencias:** Etapa 7 para no duplicar cambios en auth.  
**Objetivo:** corregir redirects y proteger eliminacion de cuenta.

Tareas:

1. Implementar allowlist y validacion de origin normalizado para `next`.
2. Agregar pruebas con barras invertidas, doble slash, codificacion y rutas validas.
3. Exigir reautenticacion reciente para eliminar cuenta.
4. Autenticar antes de leer el cuerpo y limitar su tamaño.
5. Comprobar cierre de sesion y tratamiento de datos relacionados.

Salida obligatoria:

- Pruebas de redirect interno y rechazo externo.
- Prueba de eliminacion autorizada y rechazo con sesion antigua/no reautenticada.
- Confirmacion de que login, confirmacion y recuperacion conservan su navegacion prevista.

### Etapa 9: Limites de APIs y CSRF

**Incluye:** SEC-012 y SEC-013.  
**Dependencias:** Etapas 4, 7 y 8 para evitar rehacer las mismas rutas.  
**Objetivo:** uniformar limites y origenes sin cambiar contratos validos.

Subetapas recomendadas:

1. Etapa 9A: inventariar endpoints, metodos, autenticacion y tamaño esperado.
2. Etapa 9B: implementar validacion comun de origen y tipo de contenido.
3. Etapa 9C: aplicar limites de bytes, estructura y frecuencia por endpoint.
4. Etapa 9D: probar clientes validos y solicitudes cross-site/malformadas.

Salida obligatoria:

- Matriz de endpoints con limites y politica CSRF.
- Pruebas de cuerpos grandes, `Origin` externo/ausente, `Origin: null` y JSON valido.
- Confirmacion de que chat, BYOK, administracion y eliminacion siguen funcionando desde la web.

### Etapa 10: Cabeceras y navegador

**Incluye:** SEC-014.  
**Dependencias:** Etapa 1.  
**Objetivo:** agregar defensa de navegador sin romper recursos o integraciones.

Subetapas recomendadas:

1. Etapa 10A: inventariar origenes de scripts, estilos, imagenes, fuentes y conexiones.
2. Etapa 10B: desplegar CSP report-only en pruebas.
3. Etapa 10C: corregir violaciones legitimas sin ampliar innecesariamente la politica.
4. Etapa 10D: aplicar CSP y cabeceras restantes.

Salida obligatoria:

- Politica CSP documentada por directiva.
- Informe de violaciones legitimas resueltas.
- Smoke test visual responsive de todas las areas principales.
- Prueba de Supabase, imagenes y proveedores de IA desde el navegador.

No avanzar si:

- CSP rompe la interfaz, autenticacion, imagenes o conexiones necesarias.
- Se utiliza `unsafe-inline` o un origen global sin justificacion y plan de retirada.

### Etapa 11: Privacidad y minimizacion de datos

**Incluye:** SEC-015 y SEC-016.  
**Dependencias:** Etapa 6.  
**Objetivo:** reducir datos enviados o almacenados sin degradar respuestas y funciones utiles.

Subetapas recomendadas:

1. Etapa 11A: definir DTO por cliente, administracion e IA.
2. Etapa 11B: reemplazar selecciones amplias y minimizar resultados de tools.
3. Etapa 11C: validar enlaces y detectar secretos/datos sensibles.
4. Etapa 11D: definir privacidad, proveedores, retencion y borrado de conversaciones.
5. Etapa 11E: sanear y excluir artefactos de navegador y logs.

Salida obligatoria:

- Inventario de datos enviados a cada proveedor.
- Pruebas de conversaciones, enlaces, borrado y retencion.
- Comparacion de calidad funcional de respuestas antes y despues.
- Confirmacion de que el historial guardado y las tools necesarias siguen operativos.

### Etapa 12: CI, observabilidad y respuesta a incidentes

**Incluye:** SEC-017 y SEC-018.  
**Dependencias:** puede prepararse antes, pero debe finalizar despues de las etapas funcionales.  
**Objetivo:** impedir regresiones y detectar incidentes sin registrar contenido sensible.

Subetapas recomendadas:

1. Etapa 12A: CI con instalacion congelada, lint, build y pruebas.
2. Etapa 12B: auditoria de dependencias, secret scanning y SAST.
3. Etapa 12C: pruebas RLS, auth, cuotas y prompt injection en CI.
4. Etapa 12D: alertas, presupuestos, dashboards y kill switches.
5. Etapa 12E: runbooks y simulacro de incidente.

Salida obligatoria:

- Workflows obligatorios y reproducibles.
- Evidencia de una regresion de prueba bloqueada por CI.
- Alertas y runbooks con responsable.
- Prueba de desactivacion controlada de un proveedor de IA sin afectar la web.

### Etapa 13: Auditoria final y cierre

**Incluye:** validacion conjunta de SEC-001 a SEC-018.  
**Dependencias:** todas las etapas anteriores.  
**Objetivo:** demostrar seguridad y equivalencia funcional en el entorno final.

Tareas:

1. Repetir la auditoria estatica y de dependencias.
2. Ejecutar todas las pruebas automatizadas y smoke tests funcionales.
3. Ejecutar pruebas dinamicas autorizadas sobre auth, APIs, RLS e IA.
4. Verificar configuracion real de Supabase, CDN/WAF, cookies, cabeceras y secretos.
5. Comparar los flujos definidos en el contrato de preservacion funcional con la linea base.
6. Clasificar cada riesgo como corregido, aceptado, transferido o pendiente.

Salida obligatoria:

- Informe final con evidencia reproducible.
- Lista de riesgos residuales y aprobacion explicita del responsable.
- Confirmacion de que no hay regresiones en catalogo, comparador, auth, boveda, IA o administracion.

## Plantilla de encargo para cada etapa

Para delegar una etapa a otro agente o modelo, usar una solicitud que incluya como minimo:

```text
Implementa exclusivamente la Etapa N de docs/vulnerabilidades-1.md.
Lee primero el contrato de preservacion funcional, las dependencias de la etapa y la salida de la etapa anterior.
No trabajes en etapas posteriores ni hagas refactors no necesarios.
Conserva catalogo, comparador, auth, boveda, IA y administracion salvo los comportamientos inseguros que la etapa debe bloquear.
Antes de editar, inspecciona los archivos afectados y registra el comportamiento base.
Aplica el cambio minimo correcto, agrega las pruebas de seguridad y regresion indicadas y ejecuta las verificaciones aplicables.
No modifiques ni reveles secretos. No cambies el entorno de produccion.
Al terminar, informa archivos modificados, pruebas ejecutadas, resultado funcional, ataques bloqueados, riesgos residuales y cualquier paso manual pendiente.
Si falta informacion o la etapa depende de configuracion remota no disponible, detente y documenta el bloqueo en lugar de asumir.
```

## Formato de entrega de una etapa

Cada implementador debe devolver:

1. Etapa e IDs SEC abordados.
2. Comportamiento base verificado.
3. Archivos y migraciones modificados.
4. Decisiones de seguridad tomadas.
5. Pruebas agregadas.
6. Comandos ejecutados y sus resultados.
7. Flujos legitimos verificados, incluyendo los afectados del contrato funcional.
8. Casos maliciosos bloqueados.
9. Cambios funcionales intencionales, si existen.
10. Riesgos residuales, pasos manuales y configuracion externa pendiente.
11. Indicacion explicita de si la siguiente etapa puede comenzar.

## Puertas de despliegue

### Puerta A: No publicar

No realizar un despliegue publico mientras ocurra cualquiera de estas condiciones:

- Next.js conserva vulnerabilidades criticas aplicables.
- Las politicas RLS reales de la boveda no han sido verificadas.
- `settle_ai_quota` sigue siendo manipulable desde un JWT de usuario.
- La recuperacion de contraseña acepta cualquier sesion autenticada.
- Existen secretos de produccion expuestos o sin rotar tras una posible filtracion.

### Puerta B: Beta controlada

Puede considerarse una beta limitada cuando:

- Todos los puntos P0 estan cerrados y probados.
- Existen hard caps de gasto en los proveedores de IA.
- Los limites de IP se basan en infraestructura confiable.
- Hay monitorizacion de errores, cuotas y gasto.
- Se han completado pruebas de aislamiento RLS y auth.

### Puerta C: Produccion

Puede considerarse produccion cuando:

- P0 y P1 estan cerrados.
- P2 tiene responsables y fechas acordadas.
- CI bloquea regresiones criticas.
- Existe politica de privacidad y retencion de conversaciones.
- Se ha ejecutado una prueba dinamica autorizada sobre el entorno final.

## Matriz de seguimiento

| ID | Tema | Prioridad | Estado inicial | Responsable | Fecha objetivo | Evidencia de cierre |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | Next.js y dependencias | P0 | Pendiente | Por asignar | Por definir | Auditoria, build y pruebas |
| SEC-002 | Secretos | P0 | Pendiente | Por asignar | Por definir | Rotacion y secret scan |
| SEC-003 | RLS | P0 | Pendiente | Por asignar | Por definir | Migraciones y pruebas multiusuario |
| SEC-004 | Bypass de cuota | P0 | Pendiente | Por asignar | Por definir | Pruebas RPC negativas y concurrencia |
| SEC-005 | Coste global de IA | P1 | Pendiente | Por asignar | Por definir | Hard caps, alertas y pruebas de fallo |
| SEC-006 | IP y anonimato | P1 | Pendiente | Por asignar | Por definir | Pruebas de spoofing y abuso |
| SEC-007 | Prompt injection | P1 | Pendiente | Por asignar | Por definir | Suite adversarial |
| SEC-008 | Acciones y telemetria | P1 | Pendiente | Por asignar | Por definir | Pruebas de firma y permisos RPC |
| SEC-009 | Contraseñas | P0 | Pendiente | Por asignar | Por definir | Pruebas recovery y reautenticacion |
| SEC-010 | Redirect | P1 | Pendiente | Por asignar | Por definir | Pruebas de URL maliciosa |
| SEC-011 | Borrado de cuenta | P1 | Pendiente | Por asignar | Por definir | Reautenticacion y pruebas de sesion |
| SEC-012 | CSRF | P2 | Pendiente | Por asignar | Por definir | Pruebas cross-site |
| SEC-013 | Limites de API | P1 | Pendiente | Por asignar | Por definir | Pruebas de payload y rate limit |
| SEC-014 | Cabeceras | P2 | Pendiente | Por asignar | Por definir | Escaneo de cabeceras y CSP |
| SEC-015 | Privacidad de IA | P2 | Pendiente | Por asignar | Por definir | Politica, retencion y pruebas DLP |
| SEC-016 | Minimizacion de datos | P2 | Pendiente | Por asignar | Por definir | Revision DTO y artefactos |
| SEC-017 | CI de seguridad | P3 | Pendiente | Por asignar | Por definir | Workflow obligatorio |
| SEC-018 | Respuesta a incidentes | P3 | Pendiente | Por asignar | Por definir | Runbooks y simulacro |

## Validacion final

Al completar el plan se debe realizar una segunda auditoria que incluya:

1. Revision estatica de codigo y migraciones.
2. Auditoria actualizada de dependencias.
3. Pruebas dinamicas de rutas API y callbacks.
4. Pruebas RLS con dos usuarios, anonimo, administrador y service role.
5. Pruebas de concurrencia sobre cuotas y acciones pendientes.
6. Pruebas adversariales del asistente y sus tools.
7. Verificacion de cabeceras, cookies, CDN/WAF y variables del entorno desplegado.
8. Confirmacion de presupuestos y alertas directamente en cada proveedor de IA.

El cierre debe producir un informe que diferencie riesgos corregidos, aceptados, transferidos y pendientes, con evidencia reproducible para cada decision.
