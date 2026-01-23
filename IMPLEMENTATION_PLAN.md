# Implementation Plan

## Project: Shared List App v2

Evolving from MVP to support Turnkey auth, categories, unlimited collaborators, did:webvh publication, and offline sync.

**Current Status:** Phase 5.7 completed — Offline cache fallback implemented

**Production URL:** https://lisa-production-6b0f.up.railway.app (MVP still running)

---

## Working Context (For Ralph)

### Current Task
Phase 5.8: Conflict Resolution — Detect and handle conflicts when syncing offline changes

### Problem Statement
When users make offline changes, another collaborator may have edited the same item. Currently, the SyncManager blindly applies local mutations without checking if the server has newer data. This can cause:
1. Lost updates (collaborator's changes overwritten)
2. Confusing state when item was deleted remotely
3. No user feedback about conflicts

### Files to Read First
- `src/lib/sync.ts` — SyncManager that processes queued mutations
- `src/lib/offline.ts` — QueuedMutation type and helpers
- `convex/items.ts` — Item mutations (addItem, checkItem, uncheckItem, reorderItems)
- `convex/schema.ts` — Items table (currently lacks `updatedAt` field)
- `specs/features/offline.md` — Conflict resolution spec (lines 389-404)

### Files to Create
- `src/components/notifications/Toast.tsx` — Simple toast notification component
- `src/hooks/useToast.tsx` — Toast state management hook

### Files to Modify
- `convex/schema.ts` — Add `updatedAt` field to items table
- `convex/items.ts` — Set `updatedAt` on all item mutations
- `src/lib/sync.ts` — Add timestamp comparison before executing mutations
- `src/lib/offline.ts` — May need to store expected server state for comparison

### Implementation Approach

**Step 1: Schema Update**
```typescript
// convex/schema.ts - Add updatedAt to items
items: defineTable({
  // ...existing fields
  updatedAt: v.optional(v.number()), // Timestamp of last update
})
```

**Step 2: Update Item Mutations**
```typescript
// convex/items.ts - Set updatedAt on each mutation
await ctx.db.patch(args.itemId, {
  checked: true,
  checkedByDid: args.checkedByDid,
  checkedAt: args.checkedAt,
  updatedAt: Date.now(), // Add this
});
```

**Step 3: Add Server Query for Conflict Check**
```typescript
// convex/items.ts - New query to check item state
export const getItemForSync = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.itemId);
  },
});
```

**Step 4: Conflict Detection in SyncManager**
```typescript
// src/lib/sync.ts - Before executing mutation
private async executeMutationWithConflictCheck(
  convex: ConvexReactClient,
  mutation: QueuedMutation
): Promise<{ success: boolean; conflict?: string }> {
  // For check/uncheck, verify item still exists and hasn't been updated
  if (mutation.type === 'checkItem' || mutation.type === 'uncheckItem') {
    const payload = mutation.payload as CheckItemPayload;
    const serverItem = await convex.query(api.items.getItemForSync, {
      itemId: payload.itemId
    });

    if (!serverItem) {
      return { success: false, conflict: 'Item was deleted by another user' };
    }

    if (serverItem.updatedAt && serverItem.updatedAt > mutation.timestamp) {
      return { success: false, conflict: 'Item was updated by another user' };
    }
  }

  // Execute mutation
  await this.executeMutation(convex, mutation);
  return { success: true };
}
```

**Step 5: Toast Notification System**
```typescript
// src/hooks/useToast.tsx
export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  return { toasts, addToast };
}
```

### Acceptance Criteria
- [ ] Items table has `updatedAt` field
- [ ] All item mutations set `updatedAt`
- [ ] SyncManager checks server state before applying check/uncheck mutations
- [ ] If server item.updatedAt > mutation.timestamp, mutation is discarded
- [ ] User sees toast notification when conflict detected
- [ ] If item was deleted remotely, local change is discarded with notification
- [ ] Build passes (`bun run build`)
- [ ] Lint passes (`bun run lint`)

### Key Context
- The conflict strategy is "server wins" — discard local changes if server is newer
- Toast notifications should auto-dismiss after 5 seconds
- Focus on check/uncheck conflicts first — addItem conflicts are rare (unique names)
- Reorder conflicts are complex; can skip for now (entire order gets overwritten)
- Keep toast system simple — no need for a library

### Edge Cases to Handle
1. **Item deleted remotely** — Discard local mutation, notify user
2. **List deleted remotely** — Clear local cache for that list, redirect to home (defer to Phase 5.9)
3. **Multiple conflicts** — Show one toast per conflict, don't spam user

### Definition of Done
When complete, Ralph should:
1. Test conflict scenario: User A checks item, User B checks same item offline
2. When User B comes online, their change should be discarded if User A's timestamp is newer
3. User B sees "Item was updated by another user" toast
4. All acceptance criteria checked
5. Commit with message: `feat(offline): add conflict resolution for sync (Phase 5.8)`
6. Update this section with completion status

---

## Next Up (Priority Order)

### Phase 5.8: Conflict Resolution [IN PROGRESS]
See Working Context above for implementation details.

### Phase 5.9: Offline Operation Restrictions
- Prevent list deletion when offline (too destructive)
- Prevent publish/unpublish when offline
- Show disabled state with "Available when online" tooltip

### Phase 1.8: Resend OTP
- Wire up `onResend` callback in Login.tsx → OtpInput
- OtpInput already has UI and cooldown logic ready

---

## Completed Phases

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

### Phase 3: Unlimited Collaborators [COMPLETED]

#### 3.1 [COMPLETED] Schema Migration
- ✅ Created `collaborators` junction table
- ✅ Added `role` field to collaborators
- ✅ Updated `invites` table with role field

#### 3.2 [COMPLETED] Data Migration
- ✅ Created migration script `convex/migrations/migrateCollaborators.ts`
- ✅ Migration adds owner + existing collaborator to collaborators table
- Note: Run migration before removing `collaboratorDid` field

#### 3.3 [COMPLETED] Convex Functions
- ✅ Created `convex/collaborators.ts` with full CRUD
- ✅ Updated `convex/lists.ts` to use collaborators table
- ✅ Updated `convex/invites.ts` for role-based invites

#### 3.4 [COMPLETED] Authorization
- ✅ Created `src/lib/permissions.ts` helper functions
- ✅ Added role checks to all item mutations
- ✅ `canUserEditList` helper checks collaborators table with fallback

#### 3.5 [COMPLETED] UI Updates
- ✅ Updated `ShareModal.tsx` with role selector
- ✅ Created `CollaboratorList.tsx` component
- ✅ Updated `ListView.tsx` to show all collaborators

#### 3.6 [COMPLETED] Collaborator Management
- ✅ Role change functionality (owner can change editor↔viewer)
- ✅ Remove collaborator functionality (owner removes others)
- ✅ Leave list functionality (non-owners can leave)

---

### Phase 4: did:webvh Publication [COMPLETED]

#### 4.1 [COMPLETED] Schema
- ✅ Created `publications` table with all required fields
- ✅ Added indices: `by_list`, `by_webvh_did`, `by_status`

#### 4.2 [COMPLETED] Publication Logic
- ✅ Created `src/lib/publication.ts` with `createListDID`, `getPublicListUrl`, `getDIDFromPublicUrl`
- ✅ Integrated with Originals SDK via `createDIDWithTurnkey` from `src/lib/turnkey.ts`
- ✅ `createWebvhDID` implemented in useAuth.tsx (exposed via useCurrentUser)

#### 4.3 [COMPLETED] Convex Functions
- ✅ Created `convex/publication.ts` with publishList, unpublishList, getPublicList, getPublicationStatus
- ✅ Proper ownership verification
- ✅ Legacy DID support for user lookups

#### 4.4 [COMPLETED] UI Components
- ✅ Created `src/components/publish/PublishModal.tsx`
- ✅ Created `src/components/publish/VerificationBadge.tsx`
- ✅ Added publish/unpublish button to ListView.tsx
- ✅ PublishModal integrated with button (state management)

#### 4.5 [COMPLETED] Public Route
- ✅ Created `src/pages/PublicList.tsx`
- ✅ Added route `/public/:did` to App.tsx (accessible without authentication)

---

### Phase 5: Offline Support

#### 5.1 [COMPLETED] Service Worker
- ✅ Created `src/workers/service-worker.ts` with TypeScript
- ✅ Custom Vite plugin in `vite.config.ts` to bundle SW with esbuild
- ✅ Cache static assets on install (cache name: `lisa-v1`)
- ✅ Cache-first strategy with background revalidation
- ✅ Skip Convex API calls (`*.convex.cloud`) — CRITICAL
- ✅ Return cached index.html for offline navigation
- ✅ `src/lib/sw-registration.ts` for registration and update handling
- ✅ SW registered in `src/main.tsx` on app load

#### 5.2 [COMPLETED] IndexedDB Setup
- ✅ Using `idb` package (already installed) for type-safe IndexedDB wrapper
- ✅ Created `src/lib/offline.ts` with DB schema (OfflineDBSchema)
- ✅ Stores: `lists` (keyPath `_id`), `items` (keyPath `_id`, `byList` index), `mutations` (autoIncrement)
- ✅ CRUD helpers: `queueMutation`, `getQueuedMutations`, `clearMutation`, `updateMutationRetry`
- ✅ Cache helpers for lists and items (for future phases)

#### 5.3 [COMPLETED] Sync Manager
- ✅ Created `src/lib/sync.ts` with SyncManager class
- ✅ `syncManager` singleton exported
- ✅ `sync(convex)` method processes all queued mutations in order
- ✅ Exponential backoff: 1s, 2s, 4s, 8s, 16s delays between retries
- ✅ Max 5 retries before discarding failed mutation
- ✅ `subscribe(listener)` for status updates returns unsubscribe function
- ✅ Status notifications: `idle` → `syncing` → `synced` (or `error`)

#### 5.4 [COMPLETED] useOffline Hook
- ✅ Created `src/hooks/useOffline.tsx` with `useOffline` hook
- ✅ Tracks `navigator.onLine` state reactively
- ✅ Subscribes to `online`/`offline` window events
- ✅ Triggers `syncManager.sync(convex)` on reconnect
- ✅ Subscribes to `syncManager` for status updates
- ✅ Polls pending mutation count (every 5s + on sync status change)
- ✅ Exports: `isOnline`, `syncStatus`, `pendingCount`, `manualSync`

#### 5.5 [COMPLETED] Optimistic Updates
- ✅ Created `useOptimisticItems` hook with addItem, checkItem, uncheckItem, reorderItems
- ✅ Updated `AddItemInput.tsx` to accept `onAddItem` callback
- ✅ Updated `ListItem.tsx` to accept `onCheck`/`onUncheck` callbacks and show optimistic styling
- ✅ Fixed lint error: refactored to use `useMemo` filtering instead of `useEffect` setState
- ✅ Fixed unused variable: removed `listId` from AddItemInput props
- ✅ Wired up `useOptimisticItems` in `ListView.tsx`

#### 5.6 [COMPLETED] UI Feedback
- ✅ Created `src/components/offline/OfflineIndicator.tsx` — fixed banner when offline
- ✅ Created `src/components/offline/SyncStatus.tsx` — detailed sync status with indicator and manual sync button
- ✅ Mounted `OfflineIndicator` in `App.tsx` for both authenticated and unauthenticated views
- ✅ Added ARIA live regions for accessibility

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

- [NOTE] **Migration script available** — Run `convex/migrations/migrateCollaborators.ts:migrateToCollaborators` to migrate existing lists before removing `collaboratorDid` field.

### Publication

- [WARNING] **Public data exposure** — Published lists are visible to anyone. Make sure owners understand this.

- [NOTE] **did:webvh creation requires signing** — Must use Turnkey signer, not localStorage keys.

- [NOTE] **Public route outside auth** — The `/public/:did` route must be added BEFORE the auth check in App.tsx so unauthenticated users can view public lists.

- [NOTE] **DID URL encoding** — The did:webvh DID contains colons. When used in URLs, consider encoding or using just the unique portion after `did:webvh:`.

### Offline

- [CRITICAL] **No conflict resolution** — SyncManager doesn't check server timestamps. Multiple offline edits won't reconcile properly. Phase 5.8 addresses this.

- [CRITICAL] **Service Worker updates** — SW caching can cause users to see stale app. Implement update notification with skipWaiting/claim flow.

- [CRITICAL] **Never cache Convex API** — Any URL containing `convex.cloud` must be excluded from SW fetch handling. Caching these breaks real-time sync.

- [WARNING] **Destructive ops allowed offline** — List delete and publish/unpublish should be blocked when offline. Phase 5.9 addresses this.

- [WARNING] **Conflict resolution is lossy** — Server wins conflicts. User may lose offline changes if collaborator edited same item.

- [NOTE] **Vite SW bundling solved** — Using custom Vite plugin with esbuild to compile TypeScript SW to `dist/sw.js`. Works in both dev (middleware) and production (writeBundle hook).

- [NOTE] **Storage limits** — IndexedDB has browser-enforced limits (~50MB typical). Prune old data.

- [NOTE] **SW scope** — Service worker scope defaults to its directory. Place at root (`/sw.js`) to control entire app.

- [NOTE] **HTTPS required** — Service workers only work over HTTPS (except localhost). Production is on Railway with HTTPS, so this is fine.

---

## Recently Completed

- ✓ Phase 5.7: Offline Cache Fallback — `cacheAllLists` helper in offline.ts; cache-through pattern in Home.tsx and useOptimisticItems.tsx; amber warning banner when showing cached data; build and lint pass
- ✓ Phase 5.6: UI Feedback — `OfflineIndicator.tsx` banner and `SyncStatus.tsx` detailed status component with ARIA accessibility; mounted in App.tsx
- ✓ Phase 5.5: Optimistic Updates — `src/hooks/useOptimisticItems.tsx` hook with addItem, checkItem, uncheckItem, reorderItems; ListView, AddItemInput, ListItem updated to use callbacks; build and lint pass
- ✓ Phase 5.4: useOffline Hook — `src/hooks/useOffline.tsx` with online/offline tracking, sync-on-reconnect, pending count polling
- ✓ Phase 5.3: Sync Manager — `src/lib/sync.ts` with SyncManager class, exponential backoff retries, subscribe pattern for status updates
- ✓ Phase 5.2: IndexedDB Setup — `src/lib/offline.ts` with lists/items/mutations stores, CRUD helpers for mutation queue, cache helpers for lists/items
- ✓ Phase 5.1: Service Worker — TypeScript SW with custom Vite plugin, cache-first strategy, Convex API exclusion, offline navigation fallback
- ✓ Phase 4: did:webvh Publication — schema, Convex functions, publication UI, public list view, verification badge, publish/unpublish flow
- ✓ Phase 3: Unlimited Collaborators — collaborators table, role-based invites, UI for managing collaborators, role change/remove/leave functionality
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
- [TECH-DEBT] Remove `collaboratorDid` field from lists table after running migration
- [TECH-DEBT] Remove deprecated CollaboratorBadge component (replaced by CollaboratorList)
- [TECH-DEBT] Add comprehensive E2E tests for new features
- [TECH-DEBT] Performance audit after all features implemented

### Minor Gaps (Low Priority)
- Auth: Add `signCredential` convenience method to useAuth (workaround: use `getSigner().sign()`)
- Auth: Use AuthGuard component instead of inline check in App.tsx
- Categories: Protect "Uncategorized" name from being created as a real category
- Categories: Add UI for category reordering (backend ready via `reorderCategory`)
- Publication: Item-level credential verification (VerifyButton component per spec)
- Publication: RequestAccessButton for "Join this list" flow from public view
- Publication: Rate limiting on public list queries

### Future Features
- Bitcoin inscription for lists (did:btco layer)
- Due dates and reminders
- Push notifications
- Native mobile apps (React Native)
- List templates
- Item images/attachments
- Comments on items
