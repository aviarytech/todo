# Implementation Plan

## Project: Shared List App v2

Evolving from MVP to support Turnkey auth, categories, unlimited collaborators, did:webvh publication, and offline sync.

**Current Status:** Phase 1.3 complete — Ready for Phase 1.6 (Migration Path)

**Production URL:** https://lisa-production-6b0f.up.railway.app (MVP still running)

---

## Working Context (For Ralph)

### Current Task
[IN PROGRESS] Phase 1.6: Migration Path — Support existing localStorage users migrating to Turnkey auth

### Overview
Existing users have localStorage identities (DID + private key). When they open the app, we need to:
1. Detect the legacy identity
2. Present a migration prompt (with option to skip for now)
3. If they migrate: link their existing DID/data to new Turnkey auth
4. Support both auth methods during the transition period

### Files to Read First
- `src/hooks/useIdentity.tsx` — Current localStorage identity system
- `src/hooks/useAuth.tsx` — New Turnkey auth system (already implemented)
- `src/lib/identity.ts` — localStorage storage helpers (`STORAGE_KEY = "lisa-identity"`)
- `src/App.tsx` — Entry point, uses `useIdentity` to show `IdentitySetup` if no identity
- `src/components/IdentitySetup.tsx` — Current new-user flow (name entry + DID creation)
- `convex/auth.ts:39-53` — Already handles DID linking during upsertUser (migration-ready)
- `specs/features/auth.md:38-43` — Migration acceptance criteria

### Files to Create
- `src/components/auth/MigrationPrompt.tsx` — Modal prompting user to upgrade to Turnkey
  - Shows benefits: "Secure your account with email login"
  - Two buttons: "Upgrade Now" (→ Login flow) and "Later" (→ continue with localStorage)
  - Remember "Later" choice in sessionStorage so we don't spam

### Files to Modify
- `src/App.tsx` — Add migration detection logic
  - Check for legacy identity: `localStorage.getItem("lisa-identity")`
  - Check if already using Turnkey auth: `useAuth().isAuthenticated`
  - If legacy exists AND not Turnkey-authed → show `MigrationPrompt`
- `src/hooks/useAuth.tsx` — Add `migrateLegacyIdentity(legacyDid: string)` helper
  - After OTP completes, pass the legacy DID to `upsertUser` so Convex can link accounts
  - The `convex/auth.ts:39-53` code already handles this linking
- `src/pages/Login.tsx` — Accept optional `legacyDid` prop for migration flow
  - Pass to `verifyOtp` which will include it in the Convex upsert

### Key Storage Keys
- `"lisa-identity"` — Legacy localStorage identity (has `did`, `privateKey`, `publicKey`, `displayName`)
- `"lisa-auth-state"` — Turnkey auth state (has `user`, `walletAccount`, `publicKeyMultibase`)

### Acceptance Criteria
- [ ] When user has localStorage identity but NOT Turnkey auth, show MigrationPrompt
- [ ] MigrationPrompt explains benefits and has "Upgrade" and "Later" buttons
- [ ] "Later" dismisses prompt for the session (use sessionStorage flag)
- [ ] "Upgrade" takes user to Login flow with their legacy DID preserved
- [ ] After successful Turnkey OTP, the new Turnkey account is linked to existing user data
- [ ] Users who migrated can continue to see their existing lists (DID preserved or mapped)
- [ ] Users who choose "Later" can continue using the app with localStorage identity
- [ ] Build passes (`bun run build`)
- [ ] Lint passes (`bun run lint`)

### Key Implementation Notes

1. **DID Handling Strategy**: The simplest approach is to preserve access to existing data by linking Turnkey to existing user record by DID. The `convex/auth.ts:39-53` already does this — it checks if a user exists by DID and links the Turnkey ID.

2. **The Challenge**: Turnkey generates a NEW did:peer from its Ed25519 key, which differs from the legacy localStorage DID. To preserve data access:
   - Option A: Store `legacyDid` field on user record and query by either DID
   - Option B: After migration, update all `ownerDid`/`collaboratorDid` references to new DID
   - **Recommended**: Option A is simpler and non-destructive. Add `legacyDid` field to users table.

3. **Schema Addition Needed**: Add `legacyDid: v.optional(v.string())` to users table with index `by_legacy_did`

4. **Query Updates Needed**: Update `convex/lists.ts:getUserLists` to check both `did` and `legacyDid`

### Migration Flow Sequence
```
App loads
  ↓
Check localStorage("lisa-identity") → found?
  ↓ yes
Check useAuth().isAuthenticated → true?
  ↓ no (legacy user not yet migrated)
Check sessionStorage("migration-dismissed") → true?
  ↓ no
Show MigrationPrompt
  ↓
User clicks "Upgrade Now"
  ↓
Navigate to /login with state { legacyDid: identity.did }
  ↓
User completes OTP flow
  ↓
verifyOtp() includes legacyDid in upsertUser call
  ↓
Convex links Turnkey account to existing user or stores legacyDid
  ↓
Clear localStorage("lisa-identity") after successful migration
  ↓
User continues with Turnkey auth, data preserved
```

### Definition of Done
When complete:
1. All acceptance criteria checked
2. Tested manually with existing localStorage identity
3. Commit with descriptive message
4. Push changes
5. Mark Phase 1.6 as completed in this file

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

#### 1.6 [IN PROGRESS] Migration Path
- Detect localStorage identity on app load
- Prompt migration to Turnkey
- Support both auth methods during transition
- Add `legacyDid` field to schema for DID mapping
- Update list queries to check both `did` and `legacyDid`

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

- [NOTE] **DID implementation uses did:peer** — Phase 1.3 uses simple did:peer:2 format from Ed25519 key instead of `createDIDWithTurnkey`. The `createDIDWithTurnkey` function was imported but is unused. Phase 1.5 can upgrade to did:webvh if needed.

- [WARNING] **DID mismatch on migration** — Legacy users have a localStorage DID, but Turnkey generates a NEW DID from its wallet key. These DIDs will NOT match. Must store `legacyDid` and update queries to check both, or user loses access to their lists.

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

- ✓ Phase 1.3: Full OTP flow integration in useAuth with Turnkey API calls
- ✓ Phase 1.4: Convex schema updated with Turnkey fields and auth.ts created
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
