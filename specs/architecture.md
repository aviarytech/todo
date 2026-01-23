# Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) |
| Backend | Convex |
| Asset Protocol | Originals SDK (`@originals/sdk`) |
| Deployment | Railway |

## System Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Partner A     │     │   Partner B     │
│   (React App)   │     │   (React App)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    WebSocket/HTTP     │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Convex    │
              │  (Backend)  │
              │             │
              │ - Lists     │
              │ - Items     │
              │ - Users     │
              │ - Invites   │
              └─────────────┘
```

## Key Architectural Decisions

### 1. Originals Integration

Each **list** is an Originals asset:
- Created with `did:peer` (private by default)
- Published to `did:webvh` for discovery/sharing
- Stores the list metadata and ownership credentials

Each **item action** (add, remove, check) generates a Verifiable Credential:
- Signed by the user who performed the action
- Stored in Convex for real-time sync
- Linked to the list's credential chain

### 2. Identity

Users are identified by DIDs generated via Originals SDK:
- DID created on first visit (stored in localStorage)
- Display name chosen by user
- Partner association happens via invite link

### 3. Real-time Sync

Convex handles real-time subscriptions:
- Optimistic updates for snappy UX
- Conflict resolution: last-write-wins (simple for v1)
- Credential verification happens client-side

### 4. Invite Flow

1. User A creates list → gets invite link with list ID + one-time token
2. User B opens link → joins list, both DIDs now authorized
3. Token invalidated after use

## Directory Structure

```
src/
├── components/       # React components
│   ├── List.tsx
│   ├── ListItem.tsx
│   ├── InviteModal.tsx
│   └── ...
├── hooks/            # Custom React hooks
│   ├── useList.ts
│   ├── useOriginals.ts
│   └── ...
├── lib/              # Utilities and SDK wrappers
│   ├── originals.ts  # Originals SDK setup
│   └── convex.ts     # Convex client setup
├── pages/            # Route pages
│   ├── Home.tsx
│   ├── ListView.tsx
│   └── JoinList.tsx
└── convex/           # Convex backend functions
    ├── schema.ts
    ├── lists.ts
    ├── items.ts
    └── invites.ts
```

## Security Considerations

- DIDs stored in localStorage (acceptable for v1, consider more secure storage later)
- Invite tokens are single-use and expire after 24 hours
- All item mutations verify the user's DID is authorized for the list
- Credentials are verified client-side before displaying provenance
