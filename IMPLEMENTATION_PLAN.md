# Implementation Plan

## Working Context (For Ralph)

*No active task — pick from Next Up.*

---

## Next Up

- Add server-side credential signing action (move `signItemActionWithSigner` to Convex)
- Add server-side arbitrary data signing endpoint
- Simplify client — remove client-side Turnkey/signing, call server endpoints
- Update useAuth.tsx to rely on server-provided DID (no client-side wallet setup)

## Warnings

- [WARNING] `convex/didCreation.ts` uses raw `@turnkey/http` client access (`turnkeyClient.client.getWalletAccounts()`) because `TurnkeyHttpClient.apiClient()` doesn't expose `getWalletAccounts` yet. If @originals/auth adds this method later, switch to the wrapper.
- [WARNING] `convex/_generated/api.d.ts` was manually edited to add `didCreation` module. Run `npx convex dev` to regenerate properly.

## Recently Completed

- ✓ Restore server-side signing with @originals/auth 1.7.1
  - Upgraded @originals/auth and @originals/sdk to ^1.7.1
  - Added @turnkey/core ^1.11.0 for client-side type definitions
  - Fixed `convex/didCreation.ts` to use `getWallets()` + raw client `getWalletAccounts()` (wrapper doesn't expose it)
  - Removed unused client-side `getOrCreateDID` from useAuth.tsx
  - Server-side DID creation during OTP verify, client uses server-provided DID
  - Added `convex/userHttp.ts` for DID update endpoint
  - Added DID upgrade logic in `convex/auth.ts` (temp → real DID)
  - `bun run build` and `bun run lint` pass
- ✓ Auto-create did:webvh for users on login (Phase 1.5)
- ✓ "Shared with me" dashboard section

## Backlog

- Remove debug DID display from Home.tsx (cleanup)
- Client-side fallback for offline credential operations
- Migrate authInternal.ts from raw Web Crypto to @originals/auth/server (now that bundle works)
