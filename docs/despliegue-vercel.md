# Despliegue inicial en Vercel

Este proyecto no ha tenido usuarios humanos reales. El primer deployment se hará como **soft launch controlado** usando el proyecto Supabase remoto ya existente. No se debe ejecutar `supabase db reset` contra remoto ni cargar `supabase/seed.sql`.

## 1. Preflight local

```bash
pnpm exec tsc --noEmit
pnpm test:ai
pnpm lint:security
pnpm security:audit
pnpm ci:local-smokes
```

## 2. Migraciones remotas

Este comando es de solo lectura y requiere que Supabase CLI esté vinculado al proyecto remoto correcto:

```bash
pnpm check:remote-migrations
```

Si faltan migraciones, revisar el proyecto vinculado y ejecutar explícitamente:

```bash
supabase migration list
supabase db push
supabase migration list
```

Después de `db push`, repetir `pnpm check:remote-migrations`. No usar `db reset` en remoto.

## 3. Proyecto Vercel

1. Importar el repositorio en Vercel.
2. Usar el framework Next.js y el comando de build predeterminado.
3. Configurar `main` como Production Branch.
4. Mantener Deployment Protection o acceso restringido mientras se valida el soft launch.
5. Usar primero la URL `*.vercel.app`; el dominio propio se puede conectar después.

El repositorio configura un cron diario a las 03:00 UTC para las alertas de presupuesto. Si el plan de Vercel permite una frecuencia mayor, se puede cambiar el schedule después.

## 4. Variables de producción

Configurar en Vercel Production, nunca en el repositorio:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AI_ACTION_SECRET
AI_IP_HASH_SECRET
AI_PROVIDER_KEYS_ENCRYPTION_SECRET
AI_PROVIDER_KEYS_ENCRYPTION_KEY_VERSION=v1
TRUSTED_PROXY=vercel
AI_MANAGED_PROVIDERS=openrouter
OPENROUTER_API_KEY
AI_OPENROUTER_MODELS=openai/gpt-oss-20b
AI_LOCAL_ENABLED=false
AI_LOCAL_ONLY=false
AI_ANONYMOUS_TURNSTILE_REQUIRED=true
AI_ANONYMOUS_TURNSTILE_AFTER_MESSAGES=3
AI_ANONYMOUS_SESSION_TTL_HOURS=24
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
TURNSTILE_EXPECTED_HOSTNAME
AI_ALERT_CRON_SECRET
CRON_SECRET
AI_ALERT_EMAIL_TO
AI_ALERT_EMAIL_FROM
RESEND_API_KEY
AI_DISABLED=true
```

`AI_DISABLED=true` se mantiene durante el primer despliegue hasta terminar las pruebas básicas. Después se cambia a `false` desde Vercel y se registra el cambio.

Las claves BYOK de Groq, Cerebras y OpenRouter se introducen únicamente desde la interfaz autenticada; no se configuran como claves gestionadas de CoreX.

## 5. Configuración Supabase Auth

- Añadir la URL Production de Vercel como `Site URL`.
- Añadir únicamente los callback URLs reales de producción y las previews necesarias.
- Configurar SMTP real antes de probar confirmación y recuperación.
- Activar Turnstile en Auth si también se quiere proteger la creación de sesiones anónimas desde Supabase.
- Confirmar rotación de refresh tokens y límites de Auth.

## 6. Validación del soft launch

Crear solo cuentas sintéticas y ejecutar:

- Registro, confirmación, login, logout, recuperación y cambio de contraseña.
- Catálogo, comparador, builds, combos y bóveda con dos usuarios distintos.
- Chat anónimo con Turnstile, cuota, expiración de sesión y límite por IP.
- Chat autenticado con OpenRouter, presupuesto, alertas y kill switch.
- BYOK temporal con Groq, Cerebras y OpenRouter; revocar las claves después.
- Creación, confirmación, cancelación, expiración y concurrencia de acciones IA.
- CSP, cookies, imágenes, logs de Vercel y ausencia de secretos en respuestas.

Registrar fecha, deployment URL, commit, migraciones, resultado y cualquier incidencia. Borrar las cuentas y datos sintéticos al terminar.

## 7. Apertura pública

Solo abrir signup y retirar la protección del deployment cuando:

- `pnpm check:remote-migrations` esté verde.
- Las pruebas dinámicas contra remoto hayan pasado.
- Turnstile, OpenRouter, Resend, cron y kill switches estén comprobados.
- No haya errores RLS, Auth, CSP ni de consola bloqueantes.
- La interfaz pendiente tenga una decisión explícita de producto.

La URL de Vercel puede seguir disponible para pruebas sin convertirla todavía en lanzamiento público.
