## Build & Run

```bash
bun install        # Install dependencies
bun run dev        # Start Vite dev server
bun run build      # TypeScript compile + Vite build
npx convex dev     # Start Convex backend (required in separate terminal)
```

## Validation

```bash
bun run build      # TypeScript type check + build
bun run lint       # ESLint
```

## Operational Notes

- TailwindCSS v4 uses `@tailwindcss/vite` plugin (no `tailwind.config.js` needed)
- Convex generated files in `convex/_generated/` are ignored by ESLint
- `.env.local` must contain `VITE_CONVEX_URL` for Convex to work
- `vite-plugin-node-polyfills` required for @originals/sdk browser compatibility (crypto, path, buffer)
- Build warnings about `fs` module externalization are expected — SDK file operations not used in browser

### Codebase Patterns

- Use `src/lib/originals.ts` wrapper for all Originals SDK operations
- Convex mutations require timestamps passed from client (`createdAt: Date.now()`)
- Use `type` imports for TypeScript types (e.g., `type ReactNode`) due to `verbatimModuleSyntax`
