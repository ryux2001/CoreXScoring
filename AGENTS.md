<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Build, Lint & Test Commands

## Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server

## Linting
- `pnpm lint` - Run ESLint (Core Web Vitals + TypeScript rules)
- `pnpm lint --fix` - Auto-fix linting issues

## Testing
No test framework configured yet. Add one as needed:
- Playwright (in dependencies): `pnpm exec playwright test`
- Vitest/Jest: Add to `package.json` scripts

# Code Style Guidelines

## Imports
- Use `@/*` path alias for relative imports (`@/ui/components/Button`)
- Order: Third-party → Internal components → Styles
- Use `next/image` for images
- Default exports for components, named for utilities

## TypeScript
- Enable `strict: true` - no exceptions
- Use `any` sparingly; prefer `unknown` for runtime values
- Type all function parameters and return values
- Use `ReturnType<T>` for complex return types

## Naming Conventions
- Components: PascalCase (`UserProfile.tsx`)
- Utilities: camelCase (`formatCurrency.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Files match their exports

## Formatting
- Next.js ESLint preset enforces Core Web Vitals
- 2-space indentation
- Single quotes
- Semicolons optional (prefer omitting)
- `eslint-config-next/core-web-vitals`

## Error Handling
- Use `try/catch` for async operations
- Return `Error` objects with meaningful messages
- Validate inputs before processing
- Handle API failures gracefully

## Components
- Functional components with `export default`
- Accept `props` with type definition
- Use `React.FC` only when necessary
- Extract complex logic to hooks

## Project Structure
- `src/app/` - App Router pages & layouts
- `src/ui/` - Reusable components
- `src/lib/` - Utilities & business logic

## Tailwind CSS v4
- Uses PostCSS v4
- No need for `tailwind.config.js`
- Use CSS variables for theming
