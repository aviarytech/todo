# Implementation Plan

## Project: Shared List App with Originals

A real-time shared todo/grocery list for couples, built with React + Convex + Originals SDK.

**Current Status:** Phases 1-6.5 (Code Complete). Ready for deployment and verification.

---

## Working Context (For Ralph)

### Current Task
Phase 6.5: Production Readiness — **Code Complete, Awaiting Deployment**

### Status
✅ Phase 6.4 completed — Railway configuration created
✅ Phase 6.5 code work completed — Production optimizations added
✅ Gap analysis verified — No TODOs, placeholders, or stubs in codebase
✅ Build passes — TypeScript and Vite build successful
✅ Lint passes — No ESLint errors
✅ E2E tests ready — 4 test suites covering identity, lists, items, sharing

### What Remains for Phase 6.5

The app code is complete. Phase 6.5 is about **verifying production readiness**, not writing new code. This phase has two parts:

#### Part A: Pre-Deployment (User Actions)
These steps require the user to take manual action:

1. **Push to GitHub**
   ```bash
   git remote add origin git@github.com:username/lisa.git
   git push -u origin main
   ```

2. **Deploy Convex to production**
   ```bash
   npx convex deploy
   ```
   Save the production URL (e.g., `https://xxx.convex.cloud`)

3. **Create Railway project**
   - Go to https://railway.app
   - New project → "Deploy from GitHub repo"
   - Select the `lisa` repository

4. **Configure Railway environment**
   - Settings → Variables
   - Add: `VITE_CONVEX_URL=https://xxx.convex.cloud`

5. **Deploy** — Railway auto-deploys on push

#### Part B: Post-Deployment Verification (Ralph's Tasks)
After deployment, Ralph should verify:

| Check | How to Verify | Target |
|-------|--------------|--------|
| HTTPS enforced | Visit production URL, check for padlock | ✅ Required |
| Lighthouse performance | Run Lighthouse in Chrome DevTools | 90+ score |
| Full user flow | Create identity → Create list → Add items → Share → Join | All steps work |
| Convex connection | Check Network tab for WebSocket to convex.cloud | Connected |
| Error boundary | Intentionally break something, check graceful handling | Shows error UI |

### Files Ralph May Need
- `railway.toml` — Railway deployment config
- `.env.example` — Environment variable documentation
- `e2e/*.spec.ts` — E2E tests for reference on user flows

### Acceptance Criteria
- [ ] User has deployed to Railway successfully
- [ ] HTTPS is enforced (Railway default)
- [ ] Lighthouse audit shows 90+ performance score
- [ ] Full flow tested on production (identity → list → items → share → join)
- [ ] Convex WebSocket connection verified in production
- [ ] Error boundary tested and working

### Definition of Done
When Part B verification passes:
1. Update this document marking Phase 6.5 complete
2. Move project to "MVP Complete" status
3. Commit final documentation update

---

## Next Up (Priority Order)

### [AWAITING DEPLOYMENT] Phase 6.5 Production Readiness Checklist

**Code work complete:**
- [x] Production metadata in index.html (title, description, theme-color)
- [x] Bundle size optimization (code splitting) — Manual chunks in vite.config.ts
- [x] Build and lint pass

**Part A: User deploys to Railway** (manual steps in Working Context above)

**Part B: Post-deployment verification** (requires deployed app):
- [ ] HTTPS enforced (Railway default)
- [ ] Lighthouse audit 90+ performance
- [ ] Full flow tested on production
- [ ] Convex WebSocket connection verified
- [ ] Error boundary graceful handling verified

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
