# Implementation Plan

## Project: Shared List App with Originals

A real-time shared todo/grocery list for couples, built with React + Convex + Originals SDK.

**Current Status:** Phases 1-5 COMPLETE and committed. Ready for Phase 6 (Polish & Deploy).

---

## Working Context (For Ralph)

### Current Task
Phase 6: Polish & Deploy

### Status
✅ Phases 3-5 committed (v0.0.3) - Ready for Phase 6

### Next Steps
1. Add Error Boundary component
2. Responsive design pass
3. E2E tests with Playwright
4. Railway deployment

### Key Context
- **No remote configured** — Push skipped; set up remote when ready
- **Tag v0.0.3** — Marks Phase 3-5 completion
- **Build output notes:** Chunk size warnings are acceptable for v1

---

## Next Up (Priority Order)

### [IN PROGRESS] Phase 6: Polish & Deploy

#### 6.1 Add Loading and Error States
- Add error boundary component wrapping main routes
- Handle "list not found" with friendly message + back link (already done in ListView)
- Handle mutation errors with inline error messages (already done in most components)

#### 6.2 Responsive Design Pass
- Test on mobile viewport (375px width)
- Ensure touch targets are minimum 44x44px
- Stack layouts vertically on mobile where needed
- Test modal dialogs work on mobile (no overflow issues)

#### 6.3 Add E2E Tests with Playwright
Install Playwright: `bun add -D @playwright/test`

Create tests for:
1. Identity creation flow (enter name, verify identity created)
2. Create list flow (create new list, verify appears on home)
3. Add/check/remove item flow
4. Share flow (generate invite, copy link)
5. Join flow (open invite link, accept, verify list access)

#### 6.4 Configure Railway Deployment
1. Create Railway project
2. Connect to Git repo
3. Set environment variables:
   - `VITE_CONVEX_URL` — Convex deployment URL
4. Configure build command: `bun run build`
5. Configure start: serve `dist/` directory
6. Enable auto-deploy on `main` branch

#### 6.5 Production Readiness Checklist
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
