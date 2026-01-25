# Implementation Plan

## Working Context (For Ralph)

_(No active task — ready for next item from "Next Up")_

---

## Next Up

- Add "Shared with me" section to Home.tsx dashboard — split owned vs shared, show owner on shared
- Add owner attribution to shared list cards (show who owns it)
- Auto-create did:webvh for users on login — use domain from env var, Originals SDK has tools

## Backlog
- Remove debug DID display from Home.tsx (cleanup)

## Recently Completed

- Phase 9.3: Fixed TypeScript build errors
  - Added `types: ["node"]` to `tsconfig.app.json` for `process.env` support in convex files
  - Converted `AuthError` class parameter property to explicit property (erasableSyntaxOnly compliance)
  - Removed unused `useCallback` import in OtpInput.tsx
  - Fixed unused `error` variable in authInternal.ts
  - Fixed ref update during render in OtpInput.tsx (moved to useEffect)
- Phase 9.2: Auth endpoint rate limiting
- Phase 8.x: JWT auth flow, protected mutations
