# Implementation Plan

## Project: Shared List App with Originals

A real-time shared todo/grocery list for couples, built with React + Convex + Originals SDK.

**Current Status:** Phases 1-5 COMPLETE, Phase 6.1-6.3 COMPLETE. Ready for Phase 6.4-6.5 (Deploy).

---

## Working Context (For Ralph)

### Current Task
Phase 6.4: Configure Railway Deployment

### Status
✅ Phase 6.1-6.3 committed (commit 1ab8e42)
- ErrorBoundary component added
- Responsive design improvements (44x44px touch targets)
- Playwright E2E tests added

### Next Steps
1. Configure Railway deployment
2. Production readiness checklist (Phase 6.5)

### Key Context
- **No remote configured** — Need to add git remote before Railway deployment
- **E2E tests require Convex backend** — Run `npx convex dev` before `bun run test:e2e`

---

## Next Up (Priority Order)

### [IN PROGRESS] Phase 6.4: Configure Railway Deployment

1. Create Railway project
2. Connect to Git repo
3. Set environment variables:
   - `VITE_CONVEX_URL` — Convex deployment URL
4. Configure build command: `bun run build`
5. Configure start: serve `dist/` directory
6. Enable auto-deploy on `main` branch

### Phase 6.5 Production Readiness Checklist

- [ ] HTTPS enforced (Railway default)
- [ ] Run Lighthouse audit, target 90+ performance
- [ ] Test full flow on production
- [ ] Verify Convex connection works in production
- [ ] Consider Sentry for error tracking (optional)

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

- Bitcoin inscription for lists (did:btco layer)
- Multiple lists with categories
- Due dates and reminders
- More than 2 collaborators
- Offline support with sync
- Secure key storage (Web Crypto API)
- Push notifications
- Native mobile apps
- Improve `verifyItemAction()` error handling (currently best-effort, silently fails)
- Batch `getUsersByDids` optimization (currently potential N+1 in ItemAttribution)
- did:webvh publication for lists
