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

### Implementation Order (Do These Steps Sequentially)

#### Step 1: Schema Update
Add `legacyDid` field to users table.

**File:** `convex/schema.ts`
```typescript
// In users table, add after line 14 (legacyIdentity field):
legacyDid: v.optional(v.string()), // Original localStorage DID (for migration)

// Add new index after line 18 (by_email index):
.index("by_legacy_did", ["legacyDid"])
```

Then run: `bunx convex dev` to push schema changes.

#### Step 2: Update upsertUser to Store legacyDid
**File:** `convex/auth.ts`

Modify the `upsertUser` mutation args to accept optional `legacyDid`:
```typescript
args: {
  turnkeySubOrgId: v.string(),
  email: v.string(),
  did: v.string(),
  displayName: v.optional(v.string()),
  legacyDid: v.optional(v.string()), // ADD THIS
},
```

In the handler, when creating a new user or when a legacy DID is provided, store it:
```typescript
// When legacyDid is provided during migration, check if user exists by that legacy DID
if (args.legacyDid) {
  const existingByLegacyDid = await ctx.db
    .query("users")
    .withIndex("by_legacy_did", (q) => q.eq("legacyDid", args.legacyDid))
    .first();

  // Also check by regular DID in case legacyDid matches an existing record's did
  const existingByDid = await ctx.db
    .query("users")
    .withIndex("by_did", (q) => q.eq("did", args.legacyDid))
    .first();

  const existingUser = existingByLegacyDid || existingByDid;
  if (existingUser) {
    // Link Turnkey to existing user
    await ctx.db.patch(existingUser._id, {
      turnkeySubOrgId: args.turnkeySubOrgId,
      email: args.email,
      did: args.did, // Update to new Turnkey DID
      legacyDid: args.legacyDid, // Keep legacy DID for list lookups
      lastLoginAt: Date.now(),
      legacyIdentity: false,
    });
    return existingUser._id;
  }
}
```

#### Step 3: Update List Queries to Check legacyDid
**File:** `convex/lists.ts`

Modify `getUserLists` (around line 40-65) to also check by legacyDid:
```typescript
export const getUserLists = query({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    // First, check if this user has a legacyDid
    const user = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.userDid))
      .first();

    const didsToCheck = [args.userDid];
    if (user?.legacyDid) {
      didsToCheck.push(user.legacyDid);
    }

    // Get lists where user is owner (check both DIDs)
    const ownedLists: typeof allLists = [];
    for (const did of didsToCheck) {
      const lists = await ctx.db
        .query("lists")
        .withIndex("by_owner", (q) => q.eq("ownerDid", did))
        .collect();
      ownedLists.push(...lists);
    }

    // Get lists where user is collaborator (check both DIDs)
    const collaboratorLists: typeof allLists = [];
    for (const did of didsToCheck) {
      const lists = await ctx.db
        .query("lists")
        .withIndex("by_collaborator", (q) => q.eq("collaboratorDid", did))
        .collect();
      collaboratorLists.push(...lists);
    }

    // Combine and deduplicate
    const allLists = [...ownedLists];
    for (const list of collaboratorLists) {
      if (!allLists.find((l) => l._id === list._id)) {
        allLists.push(list);
      }
    }

    return allLists.sort((a, b) => b.createdAt - a.createdAt);
  },
});
```

#### Step 4: Create MigrationPrompt Component
**File:** `src/components/auth/MigrationPrompt.tsx` (NEW FILE)

```typescript
/**
 * Modal prompting localStorage users to upgrade to Turnkey auth.
 */
import { useNavigate } from "react-router-dom";

interface MigrationPromptProps {
  legacyDid: string;
  displayName: string;
  onDismiss: () => void;
}

const DISMISS_KEY = "lisa-migration-dismissed";

export function MigrationPrompt({ legacyDid, displayName, onDismiss }: MigrationPromptProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    // Navigate to login with legacy DID in state
    navigate("/login", { state: { legacyDid, displayName } });
  };

  const handleLater = () => {
    // Remember dismissal for this session
    sessionStorage.setItem(DISMISS_KEY, "true");
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Secure Your Account
        </h2>
        <p className="text-gray-600 mb-4">
          Hi {displayName}! Upgrade to email login for better security:
        </p>
        <ul className="text-sm text-gray-600 mb-6 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Access your lists from any device</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Keys secured by Turnkey (never exposed)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Keep all your existing lists</span>
          </li>
        </ul>

        <div className="flex gap-3">
          <button
            onClick={handleUpgrade}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700"
          >
            Upgrade Now
          </button>
          <button
            onClick={handleLater}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-200"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

export function isMigrationDismissed(): boolean {
  return sessionStorage.getItem(DISMISS_KEY) === "true";
}
```

#### Step 5: Update useAuth to Accept legacyDid
**File:** `src/hooks/useAuth.tsx`

Modify `verifyOtp` to accept optional `legacyDid`:
```typescript
// Change verifyOtp signature (around line 64):
verifyOtp: (code: string, legacyDid?: string) => Promise<void>;

// In verifyOtp implementation (around line 290), accept legacyDid param:
const verifyOtp = useCallback(
  async (code: string, legacyDid?: string) => {
    // ... existing code ...

    // When calling upsertUserMutation (around line 338), include legacyDid:
    await upsertUserMutation({
      turnkeySubOrgId: authUser.turnkeySubOrgId,
      email: authUser.email,
      did: authUser.did,
      displayName: authUser.displayName,
      legacyDid, // ADD THIS
    });

    // After successful auth, clear legacy identity if migrating:
    if (legacyDid) {
      localStorage.removeItem("lisa-identity");
    }
    // ... rest of function ...
  },
  [/* existing deps */]
);
```

#### Step 6: Update Login Page to Handle Migration
**File:** `src/pages/Login.tsx`

Read legacyDid from navigation state and pass to verifyOtp:
```typescript
import { useLocation } from "react-router-dom";

// Inside Login component:
const location = useLocation();
const migrationState = location.state as { legacyDid?: string; displayName?: string } | null;

// Show migration message if coming from MigrationPrompt:
{migrationState?.legacyDid && (
  <p className="text-sm text-blue-600 mb-4 text-center">
    Upgrading account for {migrationState.displayName}
  </p>
)}

// In handleOtpComplete, pass legacyDid:
const handleOtpComplete = async (code: string) => {
  // ...
  await verifyOtp(code, migrationState?.legacyDid);
  // ...
};
```

#### Step 7: Add Login Route
**File:** `src/App.tsx`

Add the Login route (currently missing):
```typescript
import { Login } from "./pages/Login";

// In Routes section, add:
<Route path="/login" element={<Login />} />
```

#### Step 8: Update App.tsx to Show MigrationPrompt
**File:** `src/App.tsx`

```typescript
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { MigrationPrompt, isMigrationDismissed } from "./components/auth/MigrationPrompt";
import { getIdentity } from "./lib/identity";

function App() {
  const { hasIdentity, isLoading } = useIdentity();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showMigration, setShowMigration] = useState(false);
  const [legacyIdentity, setLegacyIdentity] = useState<{ did: string; displayName: string } | null>(null);

  // Check for legacy identity that needs migration
  useEffect(() => {
    if (authLoading) return;

    const legacy = getIdentity();
    if (legacy && !isAuthenticated && !isMigrationDismissed()) {
      setLegacyIdentity({ did: legacy.did, displayName: legacy.displayName });
      setShowMigration(true);
    }
  }, [isAuthenticated, authLoading]);

  // Show migration prompt modal
  {showMigration && legacyIdentity && (
    <MigrationPrompt
      legacyDid={legacyIdentity.did}
      displayName={legacyIdentity.displayName}
      onDismiss={() => setShowMigration(false)}
    />
  )}

  // Rest of existing App render...
}
```

### Key Storage Keys
- `"lisa-identity"` — Legacy localStorage identity (has `did`, `privateKey`, `publicKey`, `displayName`)
- `"lisa-auth-state"` — Turnkey auth state (has `user`, `walletAccount`, `publicKeyMultibase`)
- `"lisa-migration-dismissed"` — sessionStorage flag to not spam migration prompt

### Acceptance Criteria
- [ ] Schema updated with `legacyDid` field and index
- [ ] When user has localStorage identity but NOT Turnkey auth, show MigrationPrompt
- [ ] MigrationPrompt explains benefits and has "Upgrade" and "Later" buttons
- [ ] "Later" dismisses prompt for the session (uses sessionStorage flag)
- [ ] "Upgrade" takes user to Login flow with their legacy DID preserved
- [ ] After successful Turnkey OTP, the new Turnkey account stores legacyDid
- [ ] Users who migrated can continue to see their existing lists (queried by legacyDid)
- [ ] Users who choose "Later" can continue using the app with localStorage identity
- [ ] Build passes (`bun run build`)
- [ ] Lint passes (`bun run lint`)

### Migration Flow Sequence
```
App loads
  ↓
Check localStorage("lisa-identity") → found?
  ↓ yes
Check useAuth().isAuthenticated → true?
  ↓ no (legacy user not yet migrated)
Check sessionStorage("lisa-migration-dismissed") → true?
  ↓ no
Show MigrationPrompt
  ↓
User clicks "Upgrade Now"
  ↓
Navigate to /login with state { legacyDid: identity.did, displayName }
  ↓
User completes OTP flow
  ↓
verifyOtp(code, legacyDid) includes legacyDid in upsertUser call
  ↓
Convex stores legacyDid on user record, links to existing data
  ↓
Clear localStorage("lisa-identity") after successful migration
  ↓
User continues with Turnkey auth, data preserved via legacyDid queries
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
