# Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 (Vite) |
| Backend | Convex |
| Auth | @originals/auth + Turnkey |
| Asset Protocol | @originals/sdk |
| DID Resolution | did:webvh (via originals) |
| Offline | Service Worker + IndexedDB |
| Deployment | Railway |

## System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User A        │     │   User B        │     │   User N...     │
│   (React App)   │     │   (React App)   │     │   (React App)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ ┌─────────────────────┼───────────────────────┘
         │ │   Turnkey Auth      │
         │ │   (OTP + Keys)      │
         │ └──────────┬──────────┘
         │            │
         └────────────┼────────────────────────────────────┐
                      │                                    │
               ┌──────▼──────┐                     ┌───────▼───────┐
               │   Convex    │                     │   did:webvh   │
               │  (Backend)  │                     │   (Public)    │
               │             │                     │               │
               │ - Users     │                     │ - Published   │
               │ - Lists     │                     │   lists       │
               │ - Items     │                     │ - Discovery   │
               │ - Invites   │                     └───────────────┘
               │ - Categories│
               │ - Collaborators
               └─────────────┘
```

## Key Architectural Decisions

### 1. Authentication (NEW)

**Before:** DIDs generated client-side, private key in localStorage (insecure)

**After:** Turnkey-managed keys via @originals/auth:
- Email OTP authentication flow
- Keys stored securely in Turnkey's infrastructure
- `TurnkeyDIDSigner` for signing without exposing private keys
- Session tokens for authenticated API calls

Flow:
1. User enters email → `initOtp()` sends OTP
2. User enters OTP code → `completeOtp()` creates/logs in user
3. Turnkey creates sub-organization with wallet for user
4. DID derived from Turnkey-managed Ed25519 key
5. Session token stored in httpOnly cookie

### 2. List Organization (NEW)

Lists can be organized into categories:
- Default category: "Uncategorized"
- User-created categories (e.g., "Groceries", "Home", "Work")
- Lists can be moved between categories
- Categories are per-user (not shared)

### 3. Unlimited Collaborators (NEW)

**Before:** Single `collaboratorDid` field (max 2 users)

**After:** Separate `collaborators` table:
- Many-to-many relationship between lists and users
- Roles: `owner`, `editor`, `viewer`
- Real-time sync to all collaborators

### 4. did:webvh Publication (NEW)

Lists can be published for public discovery:
- Creates a `did:webvh` identity for the list
- Published to originals resolver
- Anyone can discover and verify the list
- Read-only public view (editing still requires invite)

### 5. Offline Support (NEW)

Service Worker + IndexedDB strategy:
- Cache app shell for offline access
- Queue mutations when offline
- Sync queue when connection restored
- Conflict resolution: server wins with merge

## Directory Structure (Updated)

```
src/
├── components/
│   ├── auth/             # NEW: Auth components
│   │   ├── LoginForm.tsx
│   │   ├── OtpInput.tsx
│   │   └── AuthGuard.tsx
│   ├── lists/
│   │   ├── ListCard.tsx
│   │   ├── CreateListModal.tsx
│   │   └── CategorySelector.tsx  # NEW
│   ├── items/
│   │   ├── ListItem.tsx
│   │   ├── AddItemInput.tsx
│   │   └── ItemAttribution.tsx
│   ├── sharing/
│   │   ├── ShareModal.tsx
│   │   ├── CollaboratorList.tsx  # NEW: Shows all collaborators
│   │   └── CollaboratorBadge.tsx
│   └── publish/              # NEW: Publication components
│       ├── PublishModal.tsx
│       └── PublicListView.tsx
├── hooks/
│   ├── useAuth.tsx           # NEW: Replaces useIdentity
│   ├── useLists.tsx
│   ├── useCategories.tsx     # NEW
│   ├── useCollaborators.tsx  # NEW
│   └── useOffline.tsx        # NEW
├── lib/
│   ├── originals.ts
│   ├── turnkey.ts            # NEW: Turnkey client wrapper
│   ├── offline.ts            # NEW: Offline queue
│   └── sync.ts               # NEW: Sync utilities
├── pages/
│   ├── Home.tsx
│   ├── Login.tsx             # NEW
│   ├── ListView.tsx
│   ├── JoinList.tsx
│   └── PublicList.tsx        # NEW
├── workers/
│   └── service-worker.ts     # NEW
└── convex/
    ├── schema.ts             # Updated
    ├── auth.ts               # NEW
    ├── users.ts
    ├── lists.ts
    ├── items.ts
    ├── invites.ts
    ├── categories.ts         # NEW
    ├── collaborators.ts      # NEW
    └── publication.ts        # NEW
```

## Security Model

### Authentication
- Turnkey manages private keys in secure enclaves
- Session tokens are short-lived (24h) with refresh
- HttpOnly cookies prevent XSS token theft
- CSRF protection via same-site cookies

### Authorization
- List access verified server-side in Convex
- Collaborator roles enforced (owner > editor > viewer)
- Invite tokens are single-use, time-limited (24h)

### Data Privacy
- Private lists only accessible to collaborators
- Published lists are publicly readable
- Item credentials verify authorship cryptographically
