# Implementation Plan

## Project: Shared List App v2

Evolving from MVP to support Turnkey auth, categories, unlimited collaborators, did:webvh publication, and offline sync.

**Current Status:** Phase 1.2 complete — Ready for Phase 1.3 (Auth Flow Integration)

**Production URL:** https://lisa-production-6b0f.up.railway.app (MVP still running)

---

## Working Context (For Ralph)

**[COMPLETED]** Phase 1.2: Login UI Components

Created:
- `src/pages/Login.tsx` — Two-step login flow (email → OTP)
- `src/components/auth/OtpInput.tsx` — 6-digit code entry with auto-advance, paste support, resend cooldown
- `src/components/auth/AuthGuard.tsx` — Protected route wrapper with loading state

---

## Next Up (Priority Order)

### Phase 1: Turnkey Authentication

#### 1.1 [COMPLETED] Setup and Dependencies
- Add `@originals/auth` to package.json
- Create `src/lib/turnkey.ts` wrapper
- Create `src/hooks/useAuth.tsx` shell (parallel to useIdentity)

#### 1.2 [COMPLETED] Login UI
- Create `src/pages/Login.tsx` with email input
- Create `src/components/auth/OtpInput.tsx` for OTP entry
- Create `src/components/auth/AuthGuard.tsx` wrapper component

#### 1.3 [NEXT] Auth Flow Integration
- Implement full OTP flow in useAuth
- Connect to Convex for user upsert
- Handle session storage (coordinate with Turnkey session tokens)

#### 1.4 Convex Schema Update
- Add `turnkeySubOrgId`, `email`, `lastLoginAt` to users table
- Add indices for new fields
- Create `convex/auth.ts` for auth-related functions

#### 1.5 DID Creation with Turnkey
- Use `createDIDWithTurnkey` for new user DID generation
- Create `TurnkeyDIDSigner` wrapper for signing
- Update originals.ts to support Turnkey signer

#### 1.6 Migration Path
- Detect localStorage identity on app load
- Prompt migration to Turnkey
- Support both auth methods during transition

#### 1.7 Replace Identity System
- Swap `useIdentity` for `useAuth` throughout app
- Update all signing to use Turnkey signer
- Remove localStorage identity code (or deprecate)

---

### Phase 2: Multiple Lists with Categories

#### 2.1 Schema Changes
- Add `categories` table to Convex schema
- Add `categoryId` field to lists table
- Create indices

#### 2.2 Convex Functions
- Create `convex/categories.ts` with CRUD operations
- Update `convex/lists.ts` to support category assignment

#### 2.3 UI Components
- Create `src/components/lists/CategorySelector.tsx`
- Create `src/components/lists/CategoryHeader.tsx`
- Update `CreateListModal.tsx` to include category selection

#### 2.4 Home Page Update
- Group lists by category on Home page
- Add collapsible category sections
- Handle empty categories

#### 2.5 Category Management
- Create category manager UI (add/rename/delete)
- Handle list reassignment when category deleted

---

### Phase 3: Unlimited Collaborators

#### 3.1 Schema Migration
- Create `collaborators` junction table
- Add `role` field to collaborators
- Update `invites` table with role field

#### 3.2 Data Migration
- Create migration script for existing lists
- Move `collaboratorDid` data to collaborators table
- Add owners to collaborators table

#### 3.3 Convex Functions
- Create `convex/collaborators.ts`
- Update `convex/lists.ts` queries to use collaborators table
- Update `convex/invites.ts` for role-based invites

#### 3.4 Authorization
- Create permission helpers (`canEdit`, `canManage`, etc.)
- Add role checks to all mutations
- Update item mutations for role verification

#### 3.5 UI Updates
- Update `ShareModal.tsx` with role selector
- Create `CollaboratorList.tsx` component
- Update `ListView.tsx` to show all collaborators

#### 3.6 Collaborator Management
- Add role change functionality
- Add remove collaborator functionality
- Add "leave list" functionality

---

### Phase 4: did:webvh Publication

#### 4.1 Schema
- Create `publications` table
- Add indices for lookup

#### 4.2 Publication Logic
- Create `src/lib/publication.ts`
- Integrate with Originals SDK for did:webvh creation
- Connect Turnkey signer for publication signing

#### 4.3 Convex Functions
- Create `convex/publication.ts`
- Record publication status
- Query public lists

#### 4.4 UI Components
- Create `PublishModal.tsx`
- Create `PublicListView.tsx`
- Add publish/unpublish buttons to ListView

#### 4.5 Public Route
- Create `src/pages/PublicList.tsx`
- Add route `/public/:did`
- Handle verification display

---

### Phase 5: Offline Support

#### 5.1 Service Worker
- Create `src/workers/service-worker.ts`
- Cache static assets
- Handle offline navigation

#### 5.2 IndexedDB Setup
- Create `src/lib/offline.ts`
- Define stores for lists, items, mutations
- Create CRUD helpers

#### 5.3 Mutation Queue
- Implement mutation queuing
- Handle queue persistence
- Create retry logic

#### 5.4 Sync Manager
- Create `src/lib/sync.ts`
- Implement sync on reconnect
- Handle conflicts

#### 5.5 useOffline Hook
- Create `src/hooks/useOffline.tsx`
- Track online/offline state
- Expose sync status and pending count

#### 5.6 Optimistic Updates
- Update item mutations for optimistic UI
- Merge server data with local optimistic data
- Handle failures gracefully

#### 5.7 UI Feedback
- Create `OfflineIndicator.tsx`
- Create `SyncStatus.tsx`
- Show pending sync count

---

## Warnings & Pitfalls

### Authentication

- [CRITICAL] **Turnkey requires API proxy** — Client-side Turnkey calls go through their auth proxy. Ensure CORS and credentials handled properly.

- [WARNING] **Session token handling** — Turnkey session tokens are separate from JWT. Coordinate storage carefully.

- [NOTE] **Migration complexity** — Existing users have DIDs from localStorage. Migration should preserve their DID or create mapping.

### Categories

- [NOTE] **Categories are per-user** — Each user has their own category organization. A shared list can be in different categories for different users.

### Collaborators

- [CRITICAL] **Breaking schema change** — Removing `collaboratorDid` from lists is breaking. Run migration before deploying schema change.

- [WARNING] **Query performance** — With unlimited collaborators, optimize queries. Don't load all collaborator details eagerly.

### Publication

- [WARNING] **Public data exposure** — Published lists are visible to anyone. Make sure owners understand this.

- [NOTE] **did:webvh creation requires signing** — Must use Turnkey signer, not localStorage keys.

### Offline

- [WARNING] **Conflict resolution is lossy** — Server wins conflicts. User may lose offline changes if collaborator edited same item.

- [NOTE] **Storage limits** — IndexedDB has browser-enforced limits (~50MB typical). Prune old data.

- [CRITICAL] **Service Worker updates** — SW caching can cause users to see stale app. Implement update notification.

---

## Recently Completed

- ✓ Phase 1.2: Login page and auth UI components (Login.tsx, OtpInput.tsx, AuthGuard.tsx)
- ✓ Phase 1.1: Turnkey client setup and useAuth hook shell
- ✓ Planning complete — Specs created for all 5 features
- ✓ MVP deployed and working at https://lisa-production-6b0f.up.railway.app

---

## Backlog (Post v2)

### Technical Debt
- [TECH-DEBT] Remove deprecated localStorage identity code after migration period
- [TECH-DEBT] Add comprehensive E2E tests for new features
- [TECH-DEBT] Performance audit after all features implemented

### Future Features
- Bitcoin inscription for lists (did:btco layer)
- Due dates and reminders
- Push notifications
- Native mobile apps (React Native)
- List templates
- Item images/attachments
- Comments on items
