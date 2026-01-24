# Implementation Plan

## Project: Shared List App v2

Evolving from MVP to support Turnkey auth, categories, unlimited collaborators, did:webvh publication, and offline sync.

**Current Status:** Phase 8 In Progress — Server-Side Authentication

v2 core is complete (Phases 1-7). Now adding server-side auth via `@originals/auth/server`.

**Production URL:** https://lisa-production-6b0f.up.railway.app (MVP still running)

---

## Working Context (For Ralph)

### Current Task
**Phase 8.5: Cleanup**

Remove unused Turnkey imports and update error handling for the new auth flow.

### Files to Read First
- `src/hooks/useAuth.tsx` — Updated auth hook (Phase 8.4)
- `src/lib/turnkey.ts` — Turnkey exports

### Files to Modify
- `src/lib/turnkey.ts` — Remove unused OTP exports
- `src/hooks/useAuth.tsx` — Remove unused imports, enhance error handling

### Acceptance Criteria
- [ ] Remove `initOtp`, `completeOtp` exports from `src/lib/turnkey.ts`
- [ ] Clean up unused imports in `useAuth.tsx`
- [ ] `bun run build` and `bun run lint` pass

### Key Context
- Phase 8.4 updated the client to use HTTP endpoints for auth
- The `initOtp` and `completeOtp` functions are no longer called directly
- Keep other Turnkey exports for wallet/signer operations

### Definition of Done
When complete, Ralph should:
1. All acceptance criteria checked
2. Commit with message: "feat: cleanup auth imports (Phase 8.5)"
3. Push changes
4. Update this section with completion status

---

## Next Up (Priority Order)

### Phase 8: Server-Side Authentication

Migrate auth from client-side Turnkey calls to server-side via `@originals/auth/server`. See `specs/features/server-auth.md`.

#### 8.1 [COMPLETED] Convex HTTP Auth Endpoints
- ✅ Created `convex/http.ts` HTTP router with routes for `/auth/initiate`, `/auth/verify`, `/auth/logout`
- ✅ Created `convex/authHttp.ts` with HTTP action handlers using `@originals/auth/server`
- ✅ Added `authSessions` table to schema with `sessionId`, `email`, `subOrgId`, `otpId`, `timestamp`, `verified`, `expiresAt`
- ✅ Created `convex/authSessions.ts` with session CRUD and cleanup functions
- ✅ Uses `createTurnkeyClient`, `initiateEmailAuth`, `verifyEmailAuth`, `signToken` from `@originals/auth/server`
- ✅ Required env vars: `TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`, `JWT_SECRET`
- ✅ Build and lint pass

#### 8.2 [COMPLETED] JWT Validation Helper
- ✅ Created `convex/lib/jwt.ts` with `verifyAuthToken(token)` helper using `@originals/auth/server`
- ✅ Created `convex/lib/auth.ts` with `requireAuth(request)` helper for HTTP actions
- ✅ `extractTokenFromRequest` extracts JWT from `Authorization: Bearer` header or `auth_token` cookie
- ✅ Returns `{ turnkeySubOrgId, email }` on success, throws `AuthError` on invalid/expired
- ✅ Added `tryAuth(request)` for optional auth and error response helpers
- ✅ Build and lint pass

#### 8.3 [COMPLETED] Protect Mutations with JWT
- ✅ Created `convex/listsHttp.ts` with HTTP action wrappers for `createList`, `deleteList`
- ✅ Created `convex/categoriesHttp.ts` with HTTP action wrappers for `createCategory`, `renameCategory`, `deleteCategory`, `setListCategory`
- ✅ Created `convex/itemsHttp.ts` with HTTP action wrappers for `addItem`, `checkItem`, `uncheckItem`, `removeItem`, `reorderItems`
- ✅ Created `convex/collaboratorsHttp.ts` with HTTP action wrappers for `addCollaborator`, `updateCollaboratorRole`, `removeCollaborator`
- ✅ All HTTP actions use `requireAuth(request)` to validate JWT
- ✅ All HTTP actions look up user by `turnkeySubOrgId` to get server-verified DID
- ✅ Added routes in `convex/http.ts` for all protected endpoints under `/api/`
- ✅ Public queries (`getPublicList`) remain accessible without auth
- ✅ Build and lint pass

#### 8.4 [COMPLETED] Update Client Auth Flow
- ✅ Updated `src/hooks/useAuth.tsx` to call Convex HTTP endpoints
- ✅ `startOtp` now calls `/auth/initiate` HTTP endpoint (removed `initOtp` direct call)
- ✅ `verifyOtp` now calls `/auth/verify` HTTP endpoint (removed `completeOtp` direct call)
- ✅ JWT token stored in localStorage and exposed via context
- ✅ `logout` calls `/auth/logout` HTTP endpoint
- ✅ Kept `TurnkeyDIDSigner` for client-side signing (attempts wallet access after server auth)
- ✅ Added `getConvexHttpUrl()` helper to derive HTTP endpoint URL from Convex URL
- ✅ Build and lint pass

#### 8.5 Cleanup
- Remove unused Turnkey client-side OTP imports
- Update error handling for new auth flow
- Build and lint pass

---

### Phase 7 [COMPLETED]: Quality Improvements

All Phase 7 items complete. These were discovered during comprehensive code review.

#### 7.1 [COMPLETED] Modal Accessibility
- ✅ Created `src/hooks/useFocusTrap.tsx` — reusable focus trap hook with ESC handler and focus restoration
- ✅ `src/components/DeleteListDialog.tsx` — `role="alertdialog"`, `aria-modal`, `aria-labelledby/describedby`
- ✅ `src/components/ShareModal.tsx` — `role="dialog"`, `aria-modal`, `aria-labelledby/describedby`
- ✅ `src/components/publish/PublishModal.tsx` — `role="dialog"`, `aria-modal` (both loading and main states)
- ✅ `src/components/lists/CategoryManager.tsx` — `role="dialog"`, `aria-modal`, `aria-labelledby`
- ✅ `src/components/CreateListModal.tsx` — `role="dialog"`, `aria-modal`, `aria-labelledby`
- ✅ Build and lint pass

#### 7.2 [COMPLETED] Replace window.confirm() with Accessible Modals
- ✅ Created `src/components/ConfirmDialog.tsx` — reusable confirmation dialog with `useFocusTrap`, `role="alertdialog"`, `aria-modal`, `aria-labelledby/describedby`
- ✅ Replaced `window.confirm()` in `CollaboratorList.tsx` — remove collaborator and leave list confirmations
- ✅ Replaced `confirm()` in `CategoryManager.tsx` — delete category confirmation
- ✅ ConfirmDialog supports loading state and danger/primary variants
- ✅ Build and lint pass

#### 7.3 [COMPLETED] Hook Memory Leak Fixes
- ✅ `useToast.tsx` — Added `timeoutRefs` Map to store timeout IDs; clear timeout in `removeToast` before removing
- ✅ `useOffline.tsx` — Added `isMounted` ref; check before `setPendingCount` in async `updateCount` functions
- ✅ `useAuth.tsx` — Added `isMountedRef` ref; check before all `setState` calls in `restoreSession` async function
- ✅ Build and lint pass

#### 7.4 [COMPLETED] Remove Debug Console Logs (LOW)
- ✅ Removed 4 `console.log` statements from `src/components/publish/PublishModal.tsx`
- ✅ Kept `console.error` statements for production debugging
- ✅ Build and lint pass

#### 7.5 [COMPLETED] Bundle Size Optimization (LOW)
- ✅ Added route-based code splitting with `React.lazy()` for ListView, JoinList, PublicList
- ✅ Added modal code splitting for DeleteListDialog, ShareModal, PublishModal in ListView
- ✅ Added `Suspense` boundaries with loading fallbacks
- ✅ Configured `manualChunks` to split `@originals/auth` separately from `@originals/sdk`
- ✅ Main bundle reduced from 802KB to 501KB (37% reduction)
- ✅ New lazy-loaded chunks: ListView (20KB), PublicList (7KB), modals (~11KB total)
- ✅ Build and lint pass

### Phase 7 (Existing): Minor Feature Gaps

#### Publication Features (Optional)
- VerifyButton component for per-item credential verification
- RequestAccessButton for "Join this list" flow
- Rate limiting on public list queries

---

### Completed Technical Debt (Phase 6)

#### 6.1 [COMPLETED] Remove deprecated identity files
- ✅ Deleted `src/hooks/useIdentity.tsx`, `src/components/IdentitySetup.tsx`, `src/components/auth/MigrationPrompt.tsx`, `src/lib/identity.ts`, `src/lib/migration.ts`
- ✅ Verified no active imports existed (only cross-references between deprecated files)
- ✅ Build and lint pass

#### 6.2 [COMPLETED] Remove collaboratorDid field from lists table
- ✅ Removed `collaboratorDid` field and `by_collaborator` index from `convex/schema.ts`
- ✅ Removed all legacy fallback code from `convex/lists.ts`, `convex/invites.ts`, `convex/items.ts`, `convex/categories.ts`
- ✅ Updated `src/pages/ListView.tsx`, `src/pages/Home.tsx`, `src/lib/offline.ts`, `src/components/ListCard.tsx`
- ✅ Deleted deprecated `src/components/CollaboratorBadge.tsx`
- ✅ Updated `convex/migrations/migrateCollaborators.ts` to note migration is complete
- ✅ Build and lint pass

#### 6.3 [COMPLETED] Protect "Uncategorized" category name
- ✅ Added case-insensitive validation to `createCategory` in `convex/categories.ts`
- ✅ Added case-insensitive validation to `renameCategory` in `convex/categories.ts`
- ✅ User-friendly error message: `"Uncategorized" is a reserved name`
- ✅ Build and lint pass

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

#### 1.8 [COMPLETED] Resend OTP
- ✅ Created `handleResendOtp` function in Login.tsx
- ✅ Passed `onResend` prop to OtpInput component
- ✅ OtpInput shows "Resend code" button with 60-second cooldown

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

#### 5.7 [COMPLETED] Offline Cache Fallback
- ✅ Added `cacheAllLists` batch helper in `src/lib/offline.ts`
- ✅ Cache-through pattern in `Home.tsx` — caches lists when online, falls back when offline
- ✅ Cache-through pattern in `useOptimisticItems.tsx` — caches items, exports `usingCache` flag
- ✅ Amber warning banner in `Home.tsx` and `ListView.tsx` when showing cached data
- ✅ Derived `usingCache` state (not setState in effects) to avoid lint errors

#### 5.8 [COMPLETED] Conflict Resolution
- ✅ Added `updatedAt` field to items table schema
- ✅ All item mutations (`addItem`, `checkItem`, `uncheckItem`, `reorderItems`) set `updatedAt`
- ✅ Added `getItemForSync` query for conflict checking
- ✅ Created toast notification system: `src/hooks/useToast.tsx`, `src/lib/toast.ts`, `src/components/notifications/Toast.tsx`
- ✅ Added `checkForConflict` method in SyncManager — checks server state before check/uncheck mutations
- ✅ If `serverItem.updatedAt > mutation.timestamp`, mutation is discarded with toast notification
- ✅ Handles item deleted remotely — shows "Item was deleted by another user" toast
- ✅ ToastProvider mounted in `main.tsx`, ToastContainer in `App.tsx`

#### 5.9 [COMPLETED] Offline Operation Restrictions
- ✅ Import `useOffline` hook in `ListView.tsx`
- ✅ Delete button disabled when offline with "Available when online" tooltip
- ✅ Publish button disabled when offline with "Available when online" tooltip
- ✅ Visual feedback: `opacity-50 cursor-not-allowed` styling when disabled

---

## Warnings & Pitfalls

### Server-Side Authentication (Phase 8)

- [CRITICAL] **Turnkey server API keys** — The `TURNKEY_API_PRIVATE_KEY` is highly sensitive. Only store in Convex environment variables, never in client code or git.

- [CRITICAL] **Convex serverless sessions** — Cannot use in-memory session storage like the `@originals/auth/server` defaults. Must use Convex `authSessions` table with TTL cleanup.

- [WARNING] **JWT secret strength** — Use a cryptographically random 256-bit secret for `JWT_SECRET`. Generate with `openssl rand -base64 32`.

- [NOTE] **Client still needs wallet access** — Server-side auth handles OTP verification, but the client still needs Turnkey wallet access for DID signing operations. The JWT can include the Turnkey session token to enable this.

- [NOTE] **HTTP actions vs mutations** — Convex HTTP actions can't call mutations directly. Use `ctx.runMutation()` to call existing mutations like `upsertUser`.

### Authentication (Legacy Notes)

- [RESOLVED] **Turnkey API proxy** — Moving to server-side auth eliminates client-side Turnkey calls for OTP.

- [WARNING] **Session token handling** — Turnkey session tokens are separate from JWT. Coordinate storage carefully.

- [NOTE] **DID implementation uses did:peer** — Phase 1.3 uses simple did:peer:2 format from Ed25519 key instead of `createDIDWithTurnkey`. The `createDIDWithTurnkey` function was imported but is unused. Phase 1.5 can upgrade to did:webvh if needed.

- [WARNING] **DID mismatch on migration** — Legacy users have a localStorage DID, but Turnkey generates a NEW DID from its wallet key. These DIDs will NOT match. The `legacyDid` field stores the old DID for backwards-compatible ownership checks.

### Categories

- [NOTE] **Categories are per-user** — Each user has their own category organization. A shared list can be in different categories for different users.

### Collaborators

- [RESOLVED] **collaboratorDid field removed** — The legacy `collaboratorDid` field has been removed from the schema (Phase 6.2). All collaborator logic now uses the `collaborators` junction table exclusively.

- [WARNING] **Query performance** — With unlimited collaborators, optimize queries. Don't load all collaborator details eagerly.

### Publication

- [WARNING] **Public data exposure** — Published lists are visible to anyone. Make sure owners understand this.

- [NOTE] **did:webvh creation requires signing** — Must use Turnkey signer, not localStorage keys.

- [NOTE] **Public route outside auth** — The `/public/:did` route must be added BEFORE the auth check in App.tsx so unauthenticated users can view public lists.

- [NOTE] **DID URL encoding** — The did:webvh DID contains colons. When used in URLs, consider encoding or using just the unique portion after `did:webvh:`.

### Offline

- [RESOLVED] **Conflict resolution implemented** — SyncManager now checks server timestamps before applying check/uncheck mutations. If server item is newer, local change is discarded with toast notification. (Phase 5.8)

- [CRITICAL] **Service Worker updates** — SW caching can cause users to see stale app. Implement update notification with skipWaiting/claim flow.

- [CRITICAL] **Never cache Convex API** — Any URL containing `convex.cloud` must be excluded from SW fetch handling. Caching these breaks real-time sync.

- [RESOLVED] **Destructive ops blocked offline** — List delete and publish/unpublish buttons are disabled when offline with tooltip "Available when online". (Phase 5.9)

- [WARNING] **Conflict resolution is lossy** — Server wins conflicts. User may lose offline changes if collaborator edited same item.

- [NOTE] **Vite SW bundling solved** — Using custom Vite plugin with esbuild to compile TypeScript SW to `dist/sw.js`. Works in both dev (middleware) and production (writeBundle hook).

- [NOTE] **Storage limits** — IndexedDB has browser-enforced limits (~50MB typical). Prune old data.

- [NOTE] **SW scope** — Service worker scope defaults to its directory. Place at root (`/sw.js`) to control entire app.

- [NOTE] **HTTPS required** — Service workers only work over HTTPS (except localhost). Production is on Railway with HTTPS, so this is fine.

### Accessibility (Discovered in Code Review)

- [RESOLVED] **Modal focus management** — All 5 modal components now have focus traps via `useFocusTrap` hook. (Phase 7.1)

- [RESOLVED] **window.confirm() usage** — All `window.confirm()` calls replaced with accessible `ConfirmDialog` component. (Phase 7.2)

### Hook Quality (Discovered in Code Review)

- [RESOLVED] **useToast memory leak** — Timeout IDs now stored in a Map and cleared when toast is removed early. (Phase 7.3)

- [RESOLVED] **useOffline polling race condition** — Added `isMounted` ref to prevent setState after unmount. (Phase 7.3)

- [RESOLVED] **useAuth session restoration** — Added `isMountedRef` ref to prevent setState after unmount. (Phase 7.3)

---

## Recently Completed

- ✓ Phase 8.4: Update Client Auth Flow — Updated `useAuth.tsx` to call `/auth/initiate` and `/auth/verify` HTTP endpoints instead of direct Turnkey calls; added `getConvexHttpUrl()` helper; JWT stored in localStorage and exposed via context; `logout` calls `/auth/logout`; kept TurnkeyDIDSigner for wallet operations; build and lint pass
- ✓ Phase 8.3: Protect Mutations with JWT — Created HTTP action wrappers (`listsHttp.ts`, `categoriesHttp.ts`, `itemsHttp.ts`, `collaboratorsHttp.ts`) that use `requireAuth(request)` to validate JWT and look up user DID by turnkeySubOrgId; added routes in `convex/http.ts` for `/api/lists/*`, `/api/categories/*`, `/api/items/*`, `/api/collaborators/*`; public queries remain accessible; build and lint pass
- ✓ Phase 8.2: JWT Validation Helper — Created `convex/lib/jwt.ts` with `verifyAuthToken(token)` and `extractTokenFromRequest`; created `convex/lib/auth.ts` with `requireAuth(request)`, `tryAuth`, `AuthError` class, and response helpers; build and lint pass
- ✓ Phase 8.1: Convex HTTP Auth Endpoints — Created `convex/http.ts` HTTP router; `convex/authHttp.ts` with `/auth/initiate`, `/auth/verify`, `/auth/logout` handlers using `@originals/auth/server`; `convex/authSessions.ts` for Convex-backed session storage; `authSessions` table in schema; build and lint pass
- ✓ Phase 7.5: Bundle Size Optimization — Route-based code splitting with `React.lazy()` for ListView, JoinList, PublicList; modal lazy loading for DeleteListDialog, ShareModal, PublishModal; `@originals/auth` split into separate chunk; main bundle reduced from 802KB to 501KB (37% reduction); build and lint pass
- ✓ Phase 7.4: Remove Debug Console Logs — Removed 4 `console.log` statements from `PublishModal.tsx`; kept `console.error` for production debugging; build and lint pass
- ✓ Phase 7.3: Hook Memory Leak Fixes — Added `timeoutRefs` Map to `useToast` for proper timeout cleanup; added `isMounted` refs to `useOffline` and `useAuth` to prevent setState after unmount; build and lint pass
- ✓ Phase 7.2: Replace window.confirm() — Created reusable `ConfirmDialog` component with `useFocusTrap`, `role="alertdialog"`, `aria-modal`, ARIA labels; replaced 3 `window.confirm()` calls in `CollaboratorList.tsx` (remove/leave) and `CategoryManager.tsx` (delete); build and lint pass
- ✓ Phase 7.1: Modal Accessibility — Created `useFocusTrap` hook with focus trap, ESC key handling, and focus restoration; added `role="dialog/alertdialog"`, `aria-modal`, `aria-labelledby/describedby` to all 5 modals (DeleteListDialog, ShareModal, PublishModal, CategoryManager, CreateListModal); build and lint pass
- ✓ Phase 7.1 (earlier): AuthGuard refactoring — Refactored to use AuthGuard for protected routes; created AuthenticatedLayout and ProtectedRoute wrappers; public routes remain accessible
- ✓ Phase 6.3: Protect "Uncategorized" category name — Added validation to `createCategory` and `renameCategory` in `convex/categories.ts`; rejects "Uncategorized" (case-insensitive); build and lint pass
- ✓ Phase 6.2: Remove collaboratorDid field — Removed field and index from schema; removed all fallback code from backend and frontend; deleted CollaboratorBadge.tsx; build and lint pass
- ✓ Phase 6.1: Remove deprecated identity files — Deleted useIdentity.tsx, IdentitySetup.tsx, MigrationPrompt.tsx, identity.ts, migration.ts; build and lint pass
- ✓ Phase 1.8: Resend OTP — Added `handleResendOtp` in Login.tsx and passed to OtpInput; 60-second cooldown UI; build and lint pass
- ✓ Phase 5.9: Offline Operation Restrictions — Delete and Publish buttons disabled when offline in `ListView.tsx`; `useOffline` hook provides `isOnline` state; build and lint pass
- ✓ Phase 5.8: Conflict Resolution — `updatedAt` field on items table; `getItemForSync` query; `checkForConflict` in SyncManager; toast notification system (`useToast`, `ToastContainer`, `src/lib/toast.ts`); build and lint pass
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

### Constraint Enforcement (From Specs Gap Analysis)
These items are specified in `specs/constraints.md` but not enforced in code:

- **Storage limits**: Enforce max 50MB IndexedDB cache, max 100 pending mutations in `src/lib/offline.ts`
- **Scalability limits**: Add validation in Convex mutations for max 1000 items/list, max 100 lists/user, max 20 categories/user
- **Stale data warning**: Show warning after 24 hours offline in `useOffline` hook
- **Touch target audit**: Verify all interactive elements meet 44x44px minimum

### Technical Debt
- [TECH-DEBT] Add comprehensive E2E tests for new features
- [TECH-DEBT] Performance audit — measure against specs/constraints.md targets (initial load <3s on 3G, item sync <1s)
- [TECH-DEBT] WCAG 2.1 AA accessibility audit with automated tools (axe-core, Lighthouse)
- [TECH-DEBT] Add rate limiting for auth endpoints (10 attempts/minute per specs)
- [TECH-DEBT] Remove/gate remaining console.log statements in `src/lib/publication.ts` and `src/lib/sw-registration.ts`

### Minor Gaps (Low Priority)
- Auth: Add `signCredential` convenience method to useAuth (workaround: use `getSigner().sign()`)
- Categories: Add UI for category reordering (backend ready via `reorderCategory`)

### Future Features
- Bitcoin inscription for lists (did:btco layer)
- Due dates and reminders
- Push notifications
- Native mobile apps (React Native)
- List templates
- Item images/attachments
- Comments on items
