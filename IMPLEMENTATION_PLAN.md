# Implementation Plan

## Project: Shared List App v2

Evolving from MVP to support Turnkey auth, categories, unlimited collaborators, did:webvh publication, and offline sync.

**Current Status:** Phase 4 complete — Ready for Phase 5 (Offline Support)

**Production URL:** https://lisa-production-6b0f.up.railway.app (MVP still running)

---

## Working Context (For Ralph)

**[IN PROGRESS]** Phase 5.1: Service Worker Setup

Starting Phase 5: Offline Support. This phase adds offline capability through service workers, IndexedDB caching, and a mutation queue.

### Current Task: 5.1 Service Worker

Create the service worker to cache static assets and enable offline app loading.

### Pre-flight Check
- `idb` package was added to package.json but `bun install` may not have run — run `bun install` first if needed

### Files to Read First
- `specs/features/offline.md` — Full specification for offline support (lines 56-102 have SW implementation)
- `vite.config.ts` — Current Vite configuration
- `src/main.tsx` — Entry point where SW registration will be added

### Files to Create
1. **`public/sw.js`** — Service worker file (plain JS, NOT TypeScript)
   - Must be in `public/` for Vite to serve it at root scope (`/sw.js`)
   - Cannot use imports — must be self-contained vanilla JS
   - See spec for exact implementation pattern

2. **`src/lib/sw-registration.ts`** — Helper to register and manage service worker
   - Register SW on app load
   - Handle SW updates (skipWaiting/claim)
   - Export a function to call from main.tsx

### Files to Modify
- `src/main.tsx` — Import and call SW registration after render

### Why public/sw.js (NOT src/workers/)
The IMPLEMENTATION_PLAN warns: "Place in `public/` or use a separate build step. Don't use `src/workers/` directly without bundler config."

Vite doesn't automatically bundle files in `src/workers/`. The simplest approach:
- Put `sw.js` in `public/` (served as-is at `/sw.js`)
- Use plain JavaScript (no TypeScript, no imports)
- The SW will have access to all assets because Vite's build output goes to the same directory

### Service Worker Implementation (public/sw.js)

```javascript
const CACHE_NAME = 'lisa-v1';

// Install: cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin, skip Convex API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // CRITICAL: Never cache Convex API calls
  if (url.hostname.includes('convex.cloud')) return;

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful same-origin responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
```

### SW Registration Helper (src/lib/sw-registration.ts)

```typescript
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('SW registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW available, could prompt user to refresh
            console.log('New content available, refresh to update');
          }
        });
      }
    });
  } catch (error) {
    console.error('SW registration failed:', error);
  }
}
```

### Integration in main.tsx

Add after the render call:
```typescript
import { registerServiceWorker } from './lib/sw-registration'

// ... existing render code ...

// Register service worker
registerServiceWorker()
```

### Acceptance Criteria
- [ ] `public/sw.js` exists with cache-first strategy
- [ ] SW caches static assets (HTML, JS, CSS) on install
- [ ] SW serves cached assets when offline
- [ ] SW explicitly skips `*.convex.cloud` URLs (CRITICAL)
- [ ] `src/lib/sw-registration.ts` exists and exports `registerServiceWorker`
- [ ] `src/main.tsx` calls `registerServiceWorker()` after render
- [ ] App shell loads when offline (navigation returns cached index.html)
- [ ] Build passes (`bun run build`)
- [ ] Lint passes (`bun run lint`)

### Testing Steps
1. `bun install` (if not done)
2. `bun run build && bun run preview`
3. Open app in browser, navigate around to populate cache
4. In DevTools → Application → Service Workers, verify SW is registered
5. In DevTools → Network, check "Offline"
6. Refresh page — app shell should load (data won't, that's expected)
7. Check console for any SW errors

### Definition of Done
When complete, Ralph should:
1. All acceptance criteria checked
2. Manual offline test passes (app shell loads)
3. Commit with message: `feat(offline): add service worker for static asset caching (Phase 5.1)`
4. Update this section with completion status

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

#### 5.1 [IN PROGRESS] Service Worker
- Create `src/workers/service-worker.ts`
- Cache static assets on install
- Serve cached assets offline (cache-first)
- Skip Convex API calls (`*.convex.cloud`)
- Return cached index.html for offline navigation

#### 5.2 IndexedDB Setup
- Add `idb` package dependency (lightweight IndexedDB wrapper)
- Create `src/lib/offline.ts` with DB schema
- Define stores: lists, items, mutations
- Create CRUD helpers for offline data

#### 5.3 Mutation Queue
- Queue mutations when offline (addItem, checkItem, uncheckItem, reorderItems)
- Persist queue to IndexedDB
- Track retry count per mutation

#### 5.4 Sync Manager
- Create `src/lib/sync.ts`
- Sync queued mutations on reconnect
- Exponential backoff for retries (1s, 2s, 4s, 8s, 16s)
- Max 5 retries before discarding
- Notify on sync conflicts

#### 5.5 useOffline Hook
- Create `src/hooks/useOffline.tsx`
- Track `navigator.onLine` state
- Subscribe to online/offline events
- Trigger sync on reconnect
- Expose: isOnline, syncStatus, pendingCount, manualSync

#### 5.6 Optimistic Updates
- Wrap item mutations for optimistic UI
- Show optimistic items immediately with temp IDs
- Queue mutation if offline
- Merge server data with optimistic items
- Rollback on failure

#### 5.7 UI Feedback
- Create `src/components/offline/OfflineIndicator.tsx` — banner when offline
- Create `src/components/offline/SyncStatus.tsx` — sync progress/status
- Show pending sync count badge
- Toast for "offline" and "back online" transitions

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

- [CRITICAL] **Service Worker updates** — SW caching can cause users to see stale app. Implement update notification with skipWaiting/claim flow.

- [CRITICAL] **Never cache Convex API** — Any URL containing `convex.cloud` must be excluded from SW fetch handling. Caching these breaks real-time sync.

- [WARNING] **Conflict resolution is lossy** — Server wins conflicts. User may lose offline changes if collaborator edited same item.

- [WARNING] **Vite SW bundling** — Service workers need special handling in Vite. Place in `public/` or use a separate build step. Don't use `src/workers/` directly without bundler config.

- [NOTE] **Storage limits** — IndexedDB has browser-enforced limits (~50MB typical). Prune old data.

- [NOTE] **SW scope** — Service worker scope defaults to its directory. Place at root (`/sw.js`) to control entire app.

- [NOTE] **HTTPS required** — Service workers only work over HTTPS (except localhost). Production is on Railway with HTTPS, so this is fine.

---

## Recently Completed

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
