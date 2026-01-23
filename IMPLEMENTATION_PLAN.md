# Implementation Plan

## Project: Shared List App with Originals

A real-time shared todo/grocery list for couples, built with React + Convex + Originals SDK.

**Current Status:** 🎉 **DEPLOYED TO PRODUCTION** — Phase 6.5 Part B (Verification) in progress.

**Production URL:** https://lisa-production-6b0f.up.railway.app

---

## Working Context (For Ralph)

### Current Task
**Deployment Fix Applied** — Awaiting operator to push and verify Railway redeploy

### Status
✅ Phase 6.4 completed — Railway configuration created
✅ Phase 6.5 Part A completed — **App deployed to Railway by operator**
✅ Gap analysis verified — No TODOs, placeholders, or stubs in codebase
✅ Build passes — TypeScript and Vite build successful
✅ Lint passes — No ESLint errors
✅ E2E tests ready — 4 test suites covering identity, lists, items, sharing
✅ **404 Fix Applied** — `serve` package added to dependencies, `railway.toml` updated

### Changes Made (Ready to Push)
1. **Added `serve` to dependencies** — `bun add serve` (now in package.json)
2. **Updated railway.toml** — Changed `npx serve` to `bunx serve` for Bun compatibility
3. **Added `start` script** — `"start": "serve dist -s"` in package.json for clarity

### Next Steps for Operator
1. Push changes: `git push`
2. Wait 2-3 minutes for Railway to rebuild
3. Verify https://lisa-production-6b0f.up.railway.app loads the app
4. Continue with verification checklist below

### What Remains for Phase 6.5

**Part A: Pre-Deployment — ✅ COMPLETE**
The operator has deployed the app to: `https://lisa-production-6b0f.up.railway.app`

**Part B: Post-Deployment Verification — BLOCKED BY 404**

The following manual verification steps should be performed on the live production URL:

| # | Check | How to Verify | Status |
|---|-------|--------------|--------|
| 1 | HTTPS enforced | Visit production URL, check for padlock icon | ⬜ Pending |
| 2 | App loads | Page renders without errors, no blank screen | ⬜ Pending |
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
- [x] **Fix 404** — `serve` package added, `railway.toml` updated (needs push & redeploy)
- [ ] HTTPS is enforced (Railway default)
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

### [IN PROGRESS] Phase 6.5 Part B: Production Verification Checklist

**Part A: Deployment — ✅ COMPLETE**
- [x] Production metadata in index.html (title, description, theme-color)
- [x] Bundle size optimization (code splitting) — Manual chunks in vite.config.ts
- [x] Build and lint pass
- [x] Deployed to Railway: https://lisa-production-6b0f.up.railway.app

**Part B: Post-deployment verification** — 🔧 FIX APPLIED, AWAITING REDEPLOY
- [x] **Fix deployment 404** — `serve` added to dependencies, `railway.toml` uses `bunx serve`
- [ ] HTTPS enforced (check padlock)
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
