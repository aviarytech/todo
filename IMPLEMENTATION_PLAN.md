# Implementation Plan

## Project: Shared List App with Originals

A real-time shared todo/grocery list for couples, built with React + Convex + Originals SDK.

**Current Status:** 🎉 **DEPLOYED AND WORKING** — Phase 6.5 Part B (Verification) ready for operator testing.

**Production URL:** https://lisa-production-6b0f.up.railway.app

---

## Working Context (For Ralph)

### Current Task
**Production Verification** — App is now live and serving HTML, ready for manual testing

### Status
✅ Phase 6.4 completed — Railway configuration created
✅ Phase 6.5 Part A completed — **App deployed to Railway by operator**
✅ **404 Issue Fixed** — Added `serve` to dependencies, changed `npx` to `bunx` in railway.toml
✅ **Deployment Working** — Production URL now returns HTTP 200 with correct HTML
✅ Gap analysis verified — No TODOs, placeholders, or stubs in codebase
✅ Build passes locally — TypeScript and Vite build successful
✅ Lint passes — No ESLint errors
✅ E2E tests ready — 4 test suites covering identity, lists, items, sharing

### Fix Applied (2026-01-23)
The 404 error was caused by `npx serve` failing because:
1. `serve` package was not in dependencies
2. `npx` may not work correctly with Bun-based Nixpacks builds

**Fix committed:**
- Added `serve` (v14.2.5) to dependencies
- Changed `railway.toml` to use `bunx serve` instead of `npx serve`
- Added `start` script to package.json

### What Remains for Phase 6.5

**Part A: Pre-Deployment — ✅ COMPLETE**
The operator has deployed the app to: `https://lisa-production-6b0f.up.railway.app`

**Part B: Post-Deployment Verification — READY FOR TESTING**

The following manual verification steps should be performed on the live production URL:

| # | Check | How to Verify | Status |
|---|-------|--------------|--------|
| 1 | HTTPS enforced | Visit production URL, check for padlock icon | ✅ Verified (HTTP/2 200 over HTTPS) |
| 2 | App loads | Page renders without errors, no blank screen | ⬜ Needs manual browser test |
| 3 | Convex connection | Check Network tab for WebSocket to convex.cloud | ⬜ Pending |
| 4 | Identity creation | Create a new identity, verify DID is generated | ⬜ Pending |
| 5 | List creation | Create a new list, verify it appears | ⬜ Pending |
| 6 | Item management | Add item, check item, delete item | ⬜ Pending |
| 7 | Sharing flow | Generate invite link, open in new tab/incognito | ⬜ Pending |
| 8 | Join flow | Accept invite as second user, verify access | ⬜ Pending |
| 9 | Real-time sync | Both users see changes within 1 second | ⬜ Pending |
| 10 | Lighthouse audit | Run Lighthouse in Chrome DevTools | ⬜ Target: 90+ |

### How to Verify

1. **Open the production URL:** https://lisa-production-6b0f.up.railway.app
2. **Check HTTPS:** Look for padlock icon in browser address bar
3. **Open DevTools (F12):**
   - Network tab → Filter by "WS" → Look for WebSocket to convex.cloud
   - Console tab → Check for any errors
4. **Test the full flow:**
   - Create identity (enter name)
   - Create a list
   - Add a few items
   - Check an item off
   - Delete an item
   - Click "Share" to generate invite link
   - Open invite link in incognito window
   - Join as second user
   - Verify both users see the same list
5. **Run Lighthouse:**
   - DevTools → Lighthouse tab
   - Check "Performance"
   - Click "Analyze page load"
   - Target: 90+ score

### Acceptance Criteria
- [x] User has deployed to Railway successfully ✅ (confirmed by operator)
- [x] `serve` package added to dependencies ✅
- [x] `railway.toml` configured correctly ✅
- [x] **404 Fixed** — Production URL now returns HTTP 200 ✅
- [x] HTTPS is enforced (Railway default) — Verified HTTP/2 over HTTPS
- [ ] App loads without errors
- [ ] Convex WebSocket connection working
- [ ] Full flow tested: identity → list → items → share → join
- [ ] Real-time sync verified between users
- [ ] Lighthouse audit shows 90+ performance score

### Definition of Done
When all verification checks pass:
1. Update this document marking Phase 6.5 complete
2. Move project to "MVP Complete" status
3. Commit final documentation update

---

## Next Up (Priority Order)

### [IN PROGRESS] Phase 6.5: Production Deployment & Verification

**Part A: Deployment — ✅ COMPLETE**
- [x] Production metadata in index.html (title, description, theme-color)
- [x] Bundle size optimization (code splitting) — Manual chunks in vite.config.ts
- [x] Build and lint pass
- [x] Deployed to Railway: https://lisa-production-6b0f.up.railway.app

**Part A.5: Fix 404 — ✅ COMPLETE**
- [x] Added `serve` to dependencies
- [x] Changed `npx serve` to `bunx serve` in railway.toml
- [x] Deployment now working (HTTP 200)

**Part B: Post-deployment verification** — READY FOR TESTING
- [x] HTTPS enforced (check padlock) — Verified
- [ ] App loads without errors
- [ ] Convex WebSocket connection verified
- [ ] Full user flow tested (identity → list → items → share → join)
- [ ] Real-time sync between users verified
- [ ] Lighthouse audit 90+ performance

**After verification passes:**
- [ ] Update IMPLEMENTATION_PLAN.md with "MVP COMPLETE" status
- [ ] Commit final status update

**Optional (Post-MVP):**
- [ ] Sentry error tracking integration

---

## Warnings & Pitfalls

### Deployment

- [NOTE] **Use `bunx` not `npx`** — When using Nixpacks with Bun, prefer `bunx serve` over `npx serve` for better compatibility.

- [NOTE] **Environment variable required** — `VITE_CONVEX_URL` must be set in Railway's environment variables for the app to connect to Convex. Without it, the app may build but fail at runtime.

### Convex

- [CRITICAL] **Convex Provider is REQUIRED** — The app will crash without `<ConvexProvider>`. Already configured.

- [CRITICAL] **Convex dev server must be running** — Run `npx convex dev` in a separate terminal. Without this, no queries/mutations will work.

- [NOTE] **Convex types are generated** — `convex/_generated/dataModel.ts` exists. Re-run `npx convex dev --once` if schema changes.

- [WARNING] **Timestamps must come from client** — Convex mutations must be deterministic. Never use `Date.now()` inside a mutation — always pass `createdAt: Date.now()` from the client.

- [NOTE] **Backend is complete** — The `convex/` directory has all schema and functions. Don't modify unless there's a bug.

### React

- [WARNING] **No impure functions in render** — The ESLint rule `react-hooks/purity` catches `Date.now()` inside useQuery. Store time in state instead.

### Originals SDK

- [WARNING] **Use the wrapper, not SDK directly** — `src/lib/originals.ts` abstracts SDK differences:
  - Use `createIdentity()` for DID generation
  - Use `createListAsset()` for creating list DIDs
  - Use `signItemAction()` for signing item credentials

- [CRITICAL] **privateKey must be in identity context** — `signItemAction()` requires the private key. The `useIdentity()` hook exposes it via `privateKey`.

### Security

- [WARNING] **localStorage is insecure** — Private key in localStorage is acceptable for MVP but document this limitation.

- [WARNING] **Validate invite tokens** — Tokens must be: cryptographically random (`crypto.randomUUID()`), single-use, time-limited (24h). Always call `validateInvite` before `acceptInvite`.

### Design Philosophy

- [WARNING] **Don't over-engineer** — v1 scope:
  - No offline support
  - No push notifications
  - Max 2 collaborators per list
  - did:peer only (no did:webvh publication)
  - Best-effort credential verification (non-blocking)

  Ship fast, iterate later.

---

## Recently Completed

- **Phase 6.5 Part A.5 Completed** — Fixed 404 deployment issue (2026-01-23)
  - Root cause: `serve` package not in dependencies, `npx` incompatible with Bun Nixpacks
  - Fix: Added `serve` to dependencies, changed `railway.toml` to use `bunx serve`
  - Commit: 1ff22b2
- **Phase 6.5 Part A Completed** — Deployed to Railway by operator (2026-01-23)
  - Production URL: https://lisa-production-6b0f.up.railway.app
- **Phase 6.5 Code Work Completed** — Production readiness optimizations
  - Updated `index.html` with proper production metadata (title, description, theme-color, apple-touch-icon)
  - Added code splitting via manual chunks in `vite.config.ts` for better caching:
    - `react-vendor`: React, React DOM, React Router
    - `convex-vendor`: Convex
    - `originals-sdk`: @originals/sdk
  - Verification items require actual deployment (HTTPS, Lighthouse audit, full flow test)
- **Phase 6.4 Completed** — Railway deployment configuration
  - Created `railway.toml` for Nixpacks build and static file serving
  - Created `.env.example` for environment variable documentation
  - Manual steps documented for user: GitHub push, Convex deploy, Railway setup
- **Phase 6.1-6.3 Committed** — Commit 1ab8e42
  - ErrorBoundary component for graceful error handling
  - Responsive design with 44x44px minimum touch targets
  - Playwright E2E tests for identity, lists, items, sharing flows
- **Phases 3-5 Committed** — Commit 5392c89, tag v0.0.3
- **Phases 1-5 Implementation** — All core features implemented:
  - Phase 1: Project setup with TailwindCSS v4, React Router v7, Convex Provider
  - Phase 2: Full identity system with DID generation, localStorage persistence, and UI
  - Phase 3: Home page, CreateListModal, ListCard, ListView, DeleteListDialog
  - Phase 4: AddItemInput, ListItem, ItemAttribution, time utilities
  - Phase 5: ShareModal, JoinList page, CollaboratorBadge
- Specs written (overview, architecture, features, constraints)
- Convex backend fully implemented
- Originals SDK wrapper completed (`src/lib/originals.ts`)
- Gap analysis confirms: No TODOs, no placeholders, no stubs in codebase

---

## Backlog (Post-MVP)

### Technical Debt (Lower Priority)
- [TECH-DEBT] Add scalability limits to backend (max 500 items/list, max 50 lists/user per constraints.md)
- [TECH-DEBT] Improve `verifyItemAction()` error handling (currently best-effort, silently fails)
- [TECH-DEBT] Batch `getUsersByDids` optimization (currently potential N+1 in ItemAttribution)
- [TECH-DEBT] Add performance monitoring (verify < 3s initial load, < 1s item sync)

### Future Features
- Bitcoin inscription for lists (did:btco layer)
- Multiple lists with categories
- Due dates and reminders
- More than 2 collaborators
- Offline support with sync
- Secure key storage (Web Crypto API)
- Push notifications
- Native mobile apps
- did:webvh publication for lists
