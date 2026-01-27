# Implementation Plan

## Working Context (For Ralph)

_No active task. Pick the next item from "Next Up"._

---

## Next Up

- Add server-side arbitrary data signing endpoint
- Simplify client — remove client-side Turnkey/signing, call server endpoints
- Update useAuth.tsx to rely on server-provided DID (no client-side wallet setup)

## Warnings

- [WARNING] `convex/didCreation.ts` and `convex/credentialSigning.ts` use raw `@turnkey/http` client access (`turnkeyClient.client.getWalletAccounts()`) because `TurnkeyHttpClient.apiClient()` doesn't expose `getWalletAccounts` yet. If @originals/auth adds this method later, switch to the wrapper.
- [WARNING] `convex/_generated/api.d.ts` was manually edited to add `didCreation` and `credentialSigning` modules. Run `npx convex dev` to regenerate properly.
- [WARNING] `npx convex codegen` fails with "ModulesTooLarge" (45.32 MiB > 42.92 MiB max). The `credentialSigning` module adds to the bundle. Consider optimizing imports or using tree-shaking in @originals/sdk if deploying to Convex cloud becomes blocked.

## Recently Completed

- ✓ Server-side credential signing action (`convex/credentialSigning.ts`) — moved `signItemActionWithSigner` to a Convex `"use node"` public action. Client components (`AddItemInput.tsx`, `ListItem.tsx`) now call `api.credentialSigning.signItemAction` via `useAction`. `subOrgId` exposed through `useCurrentUser` hook.
- ✓ Server-side DID creation with @originals/auth 1.7.1

## Backlog

- Remove debug DID display from Home.tsx (cleanup)
- Client-side fallback for offline credential operations
- Migrate authInternal.ts from raw Web Crypto to @originals/auth/server (now that bundle works)
- Clean up unused `signItemActionWithSigner` and `ExternalSigner` from `src/lib/originals.ts` (after client simplification is complete)
