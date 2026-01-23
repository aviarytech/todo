# Implementation Plan

## Project: Shared List App v2

Evolving from MVP to support Turnkey auth, categories, unlimited collaborators, did:webvh publication, and offline sync.

**Current Status:** Phase 1.7 complete — Ready for Phase 2 (Multiple Lists with Categories)

**Production URL:** https://lisa-production-6b0f.up.railway.app (MVP still running)

---

## Working Context (For Ralph)

**[COMPLETED]** Phase 1.7: Replace Identity System

### Changes Made

**Authentication Flow:**
- App now uses Turnkey-only authentication
- Unauthenticated users are redirected to `/login`
- Login page uses OTP via email for authentication
- ProfileBadge includes logout functionality

**Component Updates:**
- `src/App.tsx` — Redirects to Login for unauthenticated users, no longer uses IdentitySetup or MigrationPrompt
- `src/main.tsx` — Removed IdentityProvider, now only uses AuthProvider
- `src/pages/JoinList.tsx` — Uses useCurrentUser, shows Login for unauthenticated users
- `src/pages/ListView.tsx` — Uses getSigner() from useCurrentUser for Turnkey signing
- `src/pages/Home.tsx` — Updated comment (IdentitySetup reference removed)
- `src/components/AddItemInput.tsx` — Uses useCurrentUser with getSigner() for Turnkey signing
- `src/components/ListItem.tsx` — Accepts `signer` prop instead of `userPrivateKey`
- `src/components/ProfileBadge.tsx` — Uses useCurrentUser + useAuth for logout

**Hook Updates:**
- `src/hooks/useCurrentUser.tsx` — Simplified to Turnkey-only, exports getSigner()
- `src/hooks/useAuth.tsx` — Updated documentation (removed migration period reference)

**Library Updates:**
- `src/lib/originals.ts` — Added `signItemActionWithSigner()` and `ExternalSigner` interface for Turnkey signing

**Deprecated Files (marked @deprecated, kept for reference):**
- `src/hooks/useIdentity.tsx` — Marked deprecated, kept for reference
- `src/components/IdentitySetup.tsx` — Marked deprecated, kept for reference
- `src/components/auth/MigrationPrompt.tsx` — Marked deprecated, kept for reference

---

## Next Up (Priority Order)

### Phase 1: Turnkey Authentication [COMPLETED]

#### 1.1 [COMPLETED] Setup and Dependencies
- Add `@originals/auth` to package.json
- Create `src/lib/turnkey.ts` wrapper
- Create `src/hooks/useAuth.tsx` shell (parallel to useIdentity)

#### 1.2 [COMPLETED] Login UI
- Create `src/pages/Login.tsx` with email input
- Create `src/components/auth/OtpInput.tsx` for OTP entry
- Create `src/components/auth/AuthGuard.tsx` wrapper component

#### 1.3 [COMPLETED] Auth Flow Integration
- ✅ Implement full OTP flow in useAuth (startOtp, verifyOtp)
- ✅ Connect to Convex for user upsert
- ✅ Handle session storage (localStorage + Turnkey validation on mount)
- ✅ DID generation via did:peer:2 from Ed25519 wallet key
- ✅ TurnkeyDIDSigner creation for signing operations

#### 1.4 [COMPLETED] Convex Schema Update
- ✅ Add `turnkeySubOrgId`, `email`, `lastLoginAt`, `legacyIdentity` to users table
- ✅ Add indices for new fields (`by_turnkey_id`, `by_email`)
- ✅ Create `convex/auth.ts` with upsertUser, getUserByTurnkeyId, getUserByEmail

#### 1.5 [OPTIONAL] DID Creation with Turnkey (did:webvh upgrade)
- Currently using did:peer:2 format from Ed25519 key (sufficient for MVP)
- Future: Upgrade to `createDIDWithTurnkey` for did:webvh if needed
- TurnkeyDIDSigner is already available for signing

#### 1.6 [COMPLETED] Migration Path
- ✅ Detect localStorage identity on app load
- ✅ Prompt migration to Turnkey (MigrationPrompt component with full OTP flow)
- ✅ Support both auth methods during transition (useCurrentUser hook)
- ✅ Add `legacyDid` field to schema for DID mapping
- ✅ Update list queries to check both `did` and `legacyDid`

#### 1.7 [COMPLETED] Replace Identity System
- ✅ Swap `useIdentity` for `useAuth` throughout app
- ✅ Update all signing to use Turnkey signer (`signItemActionWithSigner`)
- ✅ Remove IdentityProvider from main.tsx
- ✅ Deprecate localStorage identity code (marked @deprecated)

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

- [NOTE] **DID implementation uses did:peer** — Phase 1.3 uses simple did:peer:2 format from Ed25519 key instead of `createDIDWithTurnkey`. The `createDIDWithTurnkey` function was imported but is unused. Phase 1.5 can upgrade to did:webvh if needed.

- [WARNING] **DID mismatch on migration** — Legacy users have a localStorage DID, but Turnkey generates a NEW DID from its wallet key. These DIDs will NOT match. The `legacyDid` field stores the old DID for backwards-compatible ownership checks.

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

- ✓ Phase 1.7: Replace Identity System — Turnkey-only auth, deprecated localStorage identity
- ✓ Phase 1.6: Migration path — legacyDid schema field, MigrationPrompt, useCurrentUser hook, dual-DID queries
- ✓ Phase 1.3: Full OTP flow integration in useAuth with Turnkey API calls
- ✓ Phase 1.4: Convex schema updated with Turnkey fields and auth.ts created
- ✓ Phase 1.2: Login page and auth UI components (Login.tsx, OtpInput.tsx, AuthGuard.tsx)
- ✓ Phase 1.1: Turnkey client setup and useAuth hook shell
- ✓ Planning complete — Specs created for all 5 features
- ✓ MVP deployed and working at https://lisa-production-6b0f.up.railway.app

---

## Backlog (Post v2)

### Technical Debt
- [TECH-DEBT] Remove deprecated localStorage identity code after migration period (useIdentity.tsx, IdentitySetup.tsx, MigrationPrompt.tsx, identity.ts, migration.ts)
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
