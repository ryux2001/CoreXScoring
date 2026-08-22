# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas que investigan, comparan y construyen configuraciones de PC; usan la web para entender hardware, evaluar rendimiento y guardar sus propias combinaciones y builds.

## Product Purpose

CoreXScoring reúne un catálogo de hardware de PC, comparativas, combos y builds con puntuaciones calculadas para ayudar a tomar decisiones informadas.

## Positioning

La diferenciación factual es que las recomendaciones y comparativas pueden apoyarse en los cálculos de scoring y compatibilidad propios de la aplicación, además de datos estructurados de su catálogo.

## Operating Context

La experiencia incluye navegación de catálogo, fichas de componentes, comparador, combos, builds y una bóveda autenticada para guardar elementos y crear configuraciones personalizadas. El asistente IA se muestra en todas las rutas principales.

## Capabilities and Constraints

- Next.js, TypeScript, Tailwind, Supabase Auth y Supabase.
- CoreX AI usa Groq como proveedor principal y OpenRouter como fallback cuando Groq alcanza su cuota/rate limit.
- Las claves de proveedor se mantienen exclusivamente en configuración de servidor.
- El asistente está especializado en hardware de PC y uso de CoreXScoring mediante guardrails de servidor; puede consultar tools de solo lectura y no modifica datos de la aplicación.
- CoreX AI admite sesiones anónimas para conversar sin registro, separadas de las cuentas permanentes y sin acceso a la bóveda.

## Brand Commitments

CoreXScoring mantiene una interfaz oscura, técnica y de alto contraste; utiliza Rajdhani para interfaz/titulares y Courier Prime para contenido técnico.

## Evidence on Hand

- Catálogo y estructuras de datos en Supabase.
- Cálculos de scoring y compatibilidad en `src/lib/scoring`.
- Bocetos de interfaz proporcionados por el usuario para los estados del asistente en escritorio y móvil.

## Product Principles

- Las decisiones sobre hardware se basan en datos y cálculos verificables.
- La interfaz debe permitir comparar y actuar sin distraer del contenido principal.
- Las acciones sensibles se validan en servidor.
- El asistente acompaña la navegación sin ocultar el control del usuario.

## Accessibility & Inclusion

La interfaz web debe ser operable por teclado, mantener foco visible, comunicar estados y errores, y conservar contraste suficiente en modo oscuro.
