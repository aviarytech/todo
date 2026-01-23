# Implementation Plan

## Project: Shared List App v2

Evolving from MVP to support Turnkey auth, categories, unlimited collaborators, did:webvh publication, and offline sync.

**Current Status:** Phase 3.1 in progress — Fix 8 TypeScript errors to unblock build

**Production URL:** https://lisa-production-6b0f.up.railway.app (MVP still running)

---

## Working Context (For Ralph)

### Current Task
**[IN PROGRESS - RECOVERED]** Phase 3.1: Fix TypeScript Errors in Collaborators Implementation

### Recovery Status
Previous work was interrupted. Phase 3.1 is MORE COMPLETE than originally documented:
- ✅ `collaborators` table added to `convex/schema.ts` (with indices)
- ✅ `convex/collaborators.ts` created with full CRUD operations
- ✅ `convex/invites.ts` updated for role-based invites
- ✅ `convex/lists.ts` updated to use collaborators table
- ✅ `convex/items.ts` has `canUserEditList` helper (now used!)
- ✅ `src/lib/permissions.ts` ALREADY EXISTS with helper functions
- ✅ `src/hooks/useCollaborators.tsx` created (bonus UI work!)
- ✅ `src/components/sharing/CollaboratorList.tsx` created (bonus UI work!)
- ❌ **BUILD FAILS** — 10 TypeScript errors need fixing

### Remaining Work: Fix 10 TypeScript Errors

**There are 3 distinct issues to fix:**

1. **`useCollaborators.tsx` and `CollaboratorList.tsx` use `user.legacyDid` from `useAuth`** but `AuthUser` doesn't have that field. These should use `useCurrentUser` instead, which DOES have `legacyDid`.

2. **`ListView.tsx` passes `legacyDid` to `ListItem`** but `ListItem` doesn't accept that prop. Either add the prop or remove it from the call.

3. **Convex type narrowing** in `collaborators.ts:83` and `invites.ts:89` — accessing optional args inside `if` block needs local const.

```
# Actual errors from `bun run build` (10 total):

convex/collaborators.ts(83,53): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
convex/invites.ts(89,53): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
src/components/sharing/CollaboratorList.tsx(90,62): error TS2339: Property 'legacyDid' does not exist on type 'AuthUser'.
src/hooks/useCollaborators.tsx(37,27): error TS2339: Property 'legacyDid' does not exist on type 'AuthUser'.
src/hooks/useCollaborators.tsx(56,23): error TS2339: Property 'legacyDid' does not exist on type 'AuthUser'.
src/hooks/useCollaborators.tsx(69,23): error TS2339: Property 'legacyDid' does not exist on type 'AuthUser'.
src/hooks/useCollaborators.tsx(81,59): error TS2339: Property 'legacyDid' does not exist on type 'AuthUser'.
src/hooks/useCollaborators.tsx(92,23): error TS2339: Property 'legacyDid' does not exist on type 'AuthUser'.
src/pages/ListView.tsx(82,9): error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
src/pages/ListView.tsx(273,15): error TS2322: Property 'legacyDid' does not exist on type 'ListItemProps'.
```

### Fix Strategy

**Fix 1: Replace `useAuth` with `useCurrentUser`** (6 errors)

Files: `src/hooks/useCollaborators.tsx` and `src/components/sharing/CollaboratorList.tsx`

Both files import and use `useAuth()` to get `user`, then try to access `user.legacyDid`. But `AuthUser` doesn't have `legacyDid` — that field comes from Convex and is available in `useCurrentUser()`.

**Change in both files:**
```typescript
// Before:
import { useAuth } from "./useAuth";
const { user } = useAuth();
// Then uses: user.did, user.legacyDid

// After:
import { useCurrentUser } from "./useCurrentUser";
const { did, legacyDid } = useCurrentUser();
// Then uses: did, legacyDid (as strings, not user.did, user.legacyDid)
```

**In `useCollaborators.tsx`:**
- Line 4: Change import from `useAuth` to `useCurrentUser`
- Line 22: Change `const { user } = useAuth()` to `const { did, legacyDid } = useCurrentUser()`
- Line 33-38: Change `user?.did` to `did` and `user.legacyDid` to `legacyDid`
- Lines 47, 55-56, 68-69, 80-81, 91-92: Similar - replace `user?.did`/`user.did` with `did`, and `user.legacyDid` with `legacyDid`

**In `CollaboratorList.tsx`:**
- Line 14: Change import from `useAuth` to `useCurrentUser`
- Line 22: Change `const { user } = useAuth()` to `const { did, legacyDid } = useCurrentUser()`
- Line 89-90: Change `user?.did`/`user?.legacyDid` to `did`/`legacyDid`

**Fix 2: ListView and ListItem prop mismatch** (2 errors)

**Option A (Simpler - Remove prop):** The `legacyDid` prop in ListView line 273 isn't actually used by ListItem. Just remove it from the call.

**Option B (Add prop):** If `legacyDid` is needed for authorization checks in ListItem, add it to `ListItemProps` interface and use it.

Looking at ListItem.tsx, it only uses `userDid` for signing and mutations. The `legacyDid` is checked at the page level (ListView) not item level. **Go with Option A — remove the prop.**

Also fix line 82: change `legacyDid,` to `legacyDid: legacyDid ?? undefined,` to convert `null` to `undefined`.

**Fix 3: Convex type narrowing** (2 errors)

**In `convex/collaborators.ts` around line 79-84:**
```typescript
// Before:
if (args.legacyDid) {
  const legacyCollab = await ctx.db
    .query("collaborators")
    .withIndex("by_list_user", (q) =>
      q.eq("listId", args.listId).eq("userDid", args.legacyDid)  // Error here
    )

// After:
const legacyDid = args.legacyDid;  // Store in const for type narrowing
if (legacyDid) {
  const legacyCollab = await ctx.db
    .query("collaborators")
    .withIndex("by_list_user", (q) =>
      q.eq("listId", args.listId).eq("userDid", legacyDid)  // Now narrowed to string
    )
```

**In `convex/invites.ts` around line 85-91:**
```typescript
// Before:
if (args.userDid) {
  const existing = await ctx.db
    .query("collaborators")
    .withIndex("by_list_user", (q) =>
      q.eq("listId", args.listId).eq("userDid", args.userDid)  // Error here
    )

// After:
const userDid = args.userDid;  // Store in const for type narrowing
if (userDid) {
  const existing = await ctx.db
    .query("collaborators")
    .withIndex("by_list_user", (q) =>
      q.eq("listId", args.listId).eq("userDid", userDid)  // Now narrowed to string
    )
```

### Files to Modify

1. **`src/hooks/useCollaborators.tsx`** — Replace `useAuth` with `useCurrentUser`
2. **`src/components/sharing/CollaboratorList.tsx`** — Replace `useAuth` with `useCurrentUser`
3. **`src/pages/ListView.tsx`** — Fix line 82 (`legacyDid ?? undefined`) and line 273 (remove `legacyDid` prop)
4. **`convex/collaborators.ts`** — Line 79: Add `const legacyDid = args.legacyDid;` before `if`
5. **`convex/invites.ts`** — Line 85: Add `const userDid = args.userDid;` before `if`

### Acceptance Criteria
- [x] `collaborators` table exists in schema with correct indices
- [x] `invites` table has optional `role` field (backwards compatible)
- [x] `convex/collaborators.ts` has CRUD operations
- [x] `src/lib/permissions.ts` exists with role helper functions
- [x] `src/hooks/useCollaborators.tsx` exists with hooks
- [x] `src/components/sharing/CollaboratorList.tsx` exists
- [ ] `useCollaborators.tsx` uses `useCurrentUser` instead of `useAuth`
- [ ] `CollaboratorList.tsx` uses `useCurrentUser` instead of `useAuth`
- [ ] `ListView.tsx` props fixed (legacyDid null→undefined, remove from ListItem)
- [ ] Type narrowing fixes in `convex/collaborators.ts` and `convex/invites.ts`
- [ ] **Build passes** (`bun run build`)

### Key Context
- **DO NOT remove `collaboratorDid`** from `lists` table yet — that happens in Phase 3.2 after data migration
- `legacyDid` is essential for migrated users - their old localStorage DID maps to lists they created before Turnkey migration
- `useCurrentUser` already fetches `legacyDid` from Convex — that's why we use it instead of `useAuth`
- The `canUserEditList` function in `items.ts` IS being used (line 70, 121, 156, 191, 245)

### Definition of Done
1. Fix all 10 TypeScript errors with the approach above
2. Verify build passes: `bun run build`
3. Test that `useCollaborators` hook works (query returns data)
4. Stage all changes: `git add convex/ src/`
5. Commit with: `feat(collaborators): fix type errors in Phase 3.1 implementation`
6. Update this section with completion status

---

## Completed Working Context

**[COMPLETED]** Phase 2: Multiple Lists with Categories

<details>
<summary>Phase 2 Changes (click to expand)</summary>

**Schema Updates:**
- Added `categories` table with `ownerDid`, `name`, `order`, `createdAt` fields
- Added indices: `by_owner`, `by_owner_name`
- Added `categoryId` optional field to `lists` table
- Added `by_category` index to `lists` table

**Convex Functions:**
- Created `convex/categories.ts` with:
  - `getUserCategories` — query user's categories sorted by order
  - `createCategory` — create with unique name validation
  - `renameCategory` — rename with ownership check
  - `deleteCategory` — delete and move lists to uncategorized
  - `reorderCategory` — update order field
  - `setListCategory` — assign list to category with access check
- Updated `convex/lists.ts`:
  - `createList` now accepts optional `categoryId`

**UI Components:**
- Created `src/hooks/useCategories.tsx` — hook for category operations
- Created `src/components/lists/CategorySelector.tsx` — dropdown with inline create
- Created `src/components/lists/CategoryHeader.tsx` — collapsible section header
- Created `src/components/lists/CategoryManager.tsx` — full category management modal
- Updated `src/components/CreateListModal.tsx` — added category selection
- Updated `src/pages/Home.tsx` — lists grouped by category with collapsible sections

</details>

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

### Phase 2: Multiple Lists with Categories [COMPLETED]

#### 2.1 [COMPLETED] Schema Changes
- ✅ Added `categories` table to Convex schema
- ✅ Added `categoryId` field to lists table
- ✅ Created indices (by_owner, by_owner_name, by_category)

#### 2.2 [COMPLETED] Convex Functions
- ✅ Created `convex/categories.ts` with CRUD operations
- ✅ Updated `convex/lists.ts:createList` to accept categoryId

#### 2.3 [COMPLETED] UI Components
- ✅ Created `src/components/lists/CategorySelector.tsx`
- ✅ Created `src/components/lists/CategoryHeader.tsx`
- ✅ Added CategorySelector to `CreateListModal.tsx`

#### 2.4 [COMPLETED] Home Page Update
- ✅ Group lists by category on Home page
- ✅ Add collapsible category sections
- ✅ Handle empty categories (hidden)

#### 2.5 [COMPLETED] Category Management
- ✅ Created `CategoryManager.tsx` (add/rename/delete UI)
- ✅ Handle list reassignment when category deleted (in convex/categories.ts)

---

### Phase 3: Unlimited Collaborators

#### 3.1 [IN PROGRESS] Schema & Permissions (See Working Context)
- ✅ Create `collaborators` junction table (done)
- ✅ Add `role` field to collaborators (done)
- ✅ Update `invites` table with role field (done)
- ✅ Create `convex/collaborators.ts` with CRUD operations (done)
- ✅ Update `convex/lists.ts` to use collaborators table (done)
- ✅ Create `src/lib/permissions.ts` helper functions (done!)
- ✅ Create `src/hooks/useCollaborators.tsx` hook (done!)
- ✅ Create `src/components/sharing/CollaboratorList.tsx` (done!)
- ❌ Fix TypeScript errors (8 errors blocking build — see Working Context)
- ❌ Add `legacyDid` to `AuthUser` interface

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

- ✓ Phase 2: Multiple Lists with Categories — schema, CRUD operations, UI components, Home page grouping, CategoryManager
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
