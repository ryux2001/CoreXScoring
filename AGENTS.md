# CoreX Scoring - Next.js 16.2.4 + Tailwind v4

## Commands
- `pnpm dev` - Dev server (http://localhost:3000)
- `pnpm build` - Production build
- `pnpm start` - Production server
- `pnpm lint` - ESLint (Core Web Vitals + TypeScript)
- `pnpm lint --fix` - Auto-fix

## Tech Stack
- Next.js 16.2.4 (App Router)
- React 19.2.4
- TypeScript 5 (strict mode)
- Tailwind CSS v4 (PostCSS v4, no config file)
- Supabase (auth + data)
- Zustand (state management)
- Recharts (charts)
- Lucide React (icons)

## Project Structure
- `src/app/` - App Router pages & layouts
- `src/app/(main)/` - Route group for main app routes
  - `/catalog/` - Product catalog
  - `/combos/` - Pre-built combos
  - `/comparator/` - Product comparison
  - `/vault/` - Saved items
- `src/lib/` - Business logic
  - `/scoring/` - Hardware scoring calculations (CPU, GPU, RAM, etc.)
  - `/config/` - Scoring configs by component type
  - `/supabaseClient.ts` - DB client
- `src/store/` - Zustand stores (auth, compare)
- `src/ui/` - Reusable components
  - `/card/` - Product cards, compare buttons
  - `/navbar/` - Navigation, search, auth status

## Key Conventions
- Path alias: `@/*` → `./src/*`
- Components: default export, typed props, no `React.FC`
- Scoring logic: per-component modules in `src/lib/scoring/calculations/`
- ESLint: `eslint-config-next/core-web-vitals` enforced
- Tailwind v4: CSS variables for theming, no `tailwind.config.js`
- Images: use `next/image`

## Auth Flow
- Supabase Auth Client wrapper: `src/app/auth/AuthClientWrapper.tsx`
- Auth store: `src/store/useAuthStore.ts`
- Login/Register forms: `src/app/auth/components/`
