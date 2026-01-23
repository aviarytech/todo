# Implementation Plan

## Project: Shared List App with Originals

A real-time shared todo/grocery list for couples, built with React + Convex + Originals SDK.

**Current Status:** Phase 2 complete. Identity system fully implemented. Ready for Phase 3 (List Management).

---

## Next Up (Priority Order)

### Phase 1: Project Setup [COMPLETE]

All setup tasks completed:
- [x] TailwindCSS v4 installed and configured (via `@tailwindcss/vite` plugin)
- [x] React Router v7 installed and configured
- [x] Convex Provider configured in `src/main.tsx`
- [x] Vite boilerplate cleaned up (`App.css` deleted, routes set up)
- [x] ESLint configured to ignore `convex/_generated`
- [x] Build and lint passing

### Phase 2: Identity System [COMPLETE]

All identity tasks completed:
- [x] `src/lib/identity.ts` — localStorage persistence (getIdentity, saveIdentity, clearIdentity)
- [x] `src/hooks/useIdentity.tsx` — React context with IdentityProvider and useIdentity hook
- [x] `src/components/IdentitySetup.tsx` — First-time setup modal
- [x] `src/components/ProfileBadge.tsx` — Header display of current user
- [x] Vite configured with Node polyfills for @originals/sdk browser compatibility
- [x] IdentityProvider wired into main.tsx (inside ConvexProvider)
- [x] App.tsx shows IdentitySetup when no identity exists

### Phase 3: List Management [IN PROGRESS]

#### 3.1 Build Home Page

Create `src/pages/Home.tsx`:
  - "Welcome to Lisa" heading
  - Brief description: "Enter your name to get started"
  - Text input for display name (required, trim whitespace)
  - "Get Started" submit button
- On submit: call `createAndSaveIdentity(displayName)` from `useIdentity()`
- Show loading spinner on button during creation
- Disable input and button while creating

#### 2.5 Build ProfileBadge Component

Create `src/components/ProfileBadge.tsx`:
- Simple inline component: "Lisa • {displayName}"
- Reads `displayName` from `useIdentity()`
- Used in header to show current user

#### 2.6 Update App.tsx with Identity Flow

Update `src/App.tsx`:
- Use `useIdentity()` hook
- If `isLoading`: show centered loading spinner
- If `!hasIdentity`: render `<IdentitySetup />` instead of main content
- If `hasIdentity`: render normal app with `<ProfileBadge />` in header

[NOTE] The Routes are placeholders. Phase 3 will replace them with actual page components.

### Phase 3: List Management [BLOCKED: Phase 2]

#### 3.1 Build Home Page

Create `src/pages/Home.tsx`:
- Query user's lists via `useQuery(api.lists.getUserLists, { userDid })`
- If lists exist: render `ListCard` for each
- If no lists: show empty state with "Create your first list" prompt
- "New List" button opens CreateListModal
- Layout: header with ProfileBadge, main content area for list grid

#### 3.2 Build CreateListModal Component

Create `src/components/CreateListModal.tsx`:
- Modal with text input for list name
- On submit:
  1. Call `createListAsset(name, userDid)` from originals.ts
  2. Call `createList` mutation with `{ assetDid, name, ownerDid, createdAt: Date.now() }`
  3. Navigate to new list via `useNavigate()`
- Cancel button to close modal
- Loading state while creating

#### 3.3 Build ListCard Component

Create `src/components/ListCard.tsx`:
- Props: `list` object from query
- Display: list name, item count badge (if items > 0), collaborator indicator icon
- Click navigates to `/list/:id`
- Visual indicator if shared (e.g., small avatar or "shared" badge)

#### 3.4 Build ListView Page

Create `src/pages/ListView.tsx`:
- Route param: `id` from `/list/:id`
- Query list via `useQuery(api.lists.getList, { id })`
- Query items via `useQuery(api.items.getListItems, { listId })`
- Header: list name, back button, share button (owner only), delete button (owner only)
- Show CollaboratorBadge if list has collaborator
- Items section placeholder (populated in Phase 4)
- AddItemInput at bottom (added in Phase 4)

#### 3.5 Build DeleteListDialog Component

Create `src/components/DeleteListDialog.tsx`:
- Confirmation dialog: "Delete [list name]? This cannot be undone."
- Confirm button calls `deleteList` mutation
- After success: navigate back to Home
- Cancel button closes dialog

### Phase 4: Item Management [BLOCKED: Phase 3]

#### 4.1 Create Relative Time Utility

Create `src/lib/time.ts`:
```typescript
export function formatRelativeTime(timestamp: number): string
// Returns: "just now", "2 minutes ago", "1 hour ago", "yesterday", "Dec 15", etc.
```
Use simple logic — no external dependencies needed. Handle:
- < 1 min: "just now"
- < 60 min: "X minutes ago"
- < 24 hours: "X hours ago"
- < 48 hours: "yesterday"
- Otherwise: short date format

#### 4.2 Build AddItemInput Component

Create `src/components/AddItemInput.tsx`:
- Text input with placeholder "Add an item..."
- Submit on Enter key or Add button click
- On submit:
  1. Call `signItemAction('ItemAdded', listDid, itemId, userDid, privateKey)`
  2. Call `addItem` mutation with `{ listId, name, createdByDid, createdAt: Date.now() }`
  3. Clear input
- Disable while submitting
- Generate `itemId` with `crypto.randomUUID()`

[NOTE] The credential from signItemAction is stored in the item for provenance tracking.

#### 4.3 Build ListItem Component

Create `src/components/ListItem.tsx`:
- Props: `item` object, `listOwnerDid`, `userDid`, `userPrivateKey`
- Checkbox: on click, sign credential then call `checkItem` or `uncheckItem` mutation
- Item name with strikethrough styling when `checked === true`
- ItemAttribution showing who added/checked
- Remove button (X icon) — signs `ItemRemoved` credential, calls `removeItem`
- Only show remove button for owner/collaborator

#### 4.4 Build ItemAttribution Component

Create `src/components/ItemAttribution.tsx`:
- Props: `item` object
- Query user names via `useQuery(api.users.getUsersByDids, { dids: [createdByDid, checkedByDid] })`
- If unchecked: "Added by [name], [relative time]"
- If checked: "Checked by [name], [relative time]"
- Use `formatRelativeTime()` for timestamps
- Small, muted text styling

### Phase 5: Sharing & Invites [BLOCKED: Phase 3]

#### 5.1 Build ShareModal Component

Create `src/components/ShareModal.tsx`:
- Triggered when owner clicks "Share" button on list
- On open:
  1. Generate token: `crypto.randomUUID()`
  2. Call `createInvite` mutation with `{ listId, token, createdAt: Date.now(), expiresAt: Date.now() + 24*60*60*1000 }`
- Display invite link: `${window.location.origin}/join/${listId}/${token}`
- Copy button — uses `navigator.clipboard.writeText()`
- Show "Copied!" feedback for 2 seconds after copy
- Note about 24-hour expiration

[WARNING] Only show Share button to list owner. Check `list.ownerDid === userDid`.

#### 5.2 Build JoinList Page

Create `src/pages/JoinList.tsx`:
- Route params: `listId`, `token` from `/join/:listId/:token`
- Flow:
  1. If no identity exists → show IdentitySetup component
  2. Call `validateInvite(listId, token)` query
  3. If invalid → show error message with reason (expired, used, list full, etc.)
  4. If valid → show "Join [list name]?" with Accept button
  5. On accept: call `acceptInvite` mutation with `{ listId, token, userDid }`
  6. On success: navigate to `/list/${listId}`
- Handle loading states for validation

#### 5.3 Build CollaboratorBadge Component

Create `src/components/CollaboratorBadge.tsx`:
- Props: `collaboratorDid: string | null`
- If `collaboratorDid` is null, render nothing
- Query collaborator name via `useQuery(api.users.getUser, { did: collaboratorDid })`
- Display: "Shared with [name]" or small avatar + name
- Used in ListView header

### Phase 6: Polish & Deploy [BLOCKED: Phases 4 & 5]

#### 6.1 Add Loading and Error States

- Add skeleton loaders for list grid on Home page
- Add skeleton loader for items list on ListView
- Add error boundary component wrapping main routes
- Add toast notifications for mutation failures (use simple CSS transitions, no external lib)
- Handle "list not found" and "unauthorized" gracefully

#### 6.2 Responsive Design Pass

- Test on mobile viewport (375px width)
- Ensure touch targets are minimum 44x44px
- Stack layouts vertically on mobile where needed
- Test on iOS Safari and Android Chrome
- Ensure modal dialogs work on mobile

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

- [CRITICAL] **Convex Provider is REQUIRED** — The app will crash without `<ConvexProvider>`. This is Phase 1, Step 3. Do not skip it.

- [CRITICAL] **Convex dev server must be running** — Run `npx convex dev` in a separate terminal. Without this, no queries/mutations will work.

- [WARNING] **Timestamps must come from client** — Convex mutations must be deterministic. Never use `Date.now()` inside a mutation — always pass `createdAt: Date.now()` from the client:
  ```typescript
  // CORRECT
  await createList({ name, ownerDid, createdAt: Date.now() });

  // WRONG — will fail
  // Mutation that calls Date.now() internally
  ```

- [NOTE] **Backend is complete** — The `convex/` directory has all schema and functions. Don't modify unless there's a bug.

- [NOTE] **Convex account required** — `npx convex dev` requires authentication. Create account at https://dashboard.convex.dev if needed.

- [WARNING] **Run `npx convex dev` to generate types** — The `convex/_generated/api.ts` is currently a placeholder. Run `npx convex dev --once --configure=new` for first-time setup, then `npx convex dev` to generate proper TypeScript types and start the backend.

### Originals SDK

- [WARNING] **Use the wrapper, not SDK directly** — `src/lib/originals.ts` abstracts SDK differences. The SDK API doesn't match the spec naming:
  - Use `createIdentity()` (not `originals.identity.create()`)
  - Use `signItemAction()` (not `originals.credentials.sign()`)

- [CRITICAL] **privateKey must be in identity context** — `signItemAction()` requires the private key. The `useIdentity()` hook must expose it.

### Security

- [WARNING] **localStorage is insecure** — Private key in localStorage is acceptable for MVP but document this limitation. Don't store sensitive data beyond identity.

- [WARNING] **Validate invite tokens** — Tokens must be: cryptographically random (`crypto.randomUUID()`), single-use, time-limited (24h). Always call `validateInvite` before `acceptInvite`.

### Design Philosophy

- [WARNING] **Don't over-engineer** — v1 scope:
  - No offline support
  - No push notifications
  - Max 2 collaborators per list
  - did:peer only (no did:webvh publication)
  - Best-effort credential verification (non-blocking)

  Ship fast, iterate later.

### Cleanup

- [NOTE] **Delete Vite boilerplate** — Remove `src/App.css` during Phase 1.4. Keep `src/index.css` (it will hold Tailwind directives).

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

---

## Recently Completed

- **Phase 2 Complete** — Full identity system with DID generation, localStorage persistence, and UI
  - `src/lib/identity.ts` — localStorage persistence
  - `src/hooks/useIdentity.tsx` — React context and hook
  - `src/components/IdentitySetup.tsx` — First-time setup modal
  - `src/components/ProfileBadge.tsx` — Header profile display
  - Vite Node polyfills configured for @originals/sdk browser compatibility
- **Phase 1 Complete** — Project setup with TailwindCSS v4, React Router v7, Convex Provider
- Specs written (overview, architecture, features, constraints)
- Convex backend fully implemented
- Originals SDK wrapper fixed
