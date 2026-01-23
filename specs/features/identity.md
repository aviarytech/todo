# Feature: User Identity

## Overview

Users have a decentralized identity (DID) managed by the Originals SDK. This identity is used to sign actions and prove authorship.

## User Stories

### Create Identity
- **As a** new user
- **I want to** set up my identity quickly
- **So that** I can start using the app

### Persist Identity
- **As a** returning user
- **I want to** keep my identity across sessions
- **So that** my actions are consistently attributed to me

### Display Identity
- **As a** user
- **I want to** see my name and my partner's name
- **So that** I know who did what

## Acceptance Criteria

### Create Identity
1. First-time user visits app
2. Prompted to enter display name
3. System generates DID via Originals SDK
4. DID and name stored in localStorage
5. User can now create/join lists

### Persist Identity
1. User returns to app
2. System loads DID from localStorage
3. User automatically authenticated
4. All previous lists accessible

### Display Identity
1. User's name shown in header/profile area
2. Partner's name shown on shared lists
3. Names shown on item attribution

## Technical Notes

### Identity Storage

```typescript
// localStorage structure
{
  "originals-identity": {
    did: string,           // did:peer:...
    displayName: string,
    privateKey: string,    // For signing (encrypted in future)
    createdAt: string,
  }
}
```

### Originals SDK Integration

```typescript
// Identity creation
const identity = await originals.identity.create();
const did = identity.did;

// Signing actions
const credential = await originals.credentials.sign({
  type: "ItemAdded",
  subject: itemId,
  issuer: did,
});
```

### Convex User Record

```typescript
// users table (for display name lookup)
{
  did: string,
  displayName: string,
  createdAt: number,
}
```

## Security Notes (v1)

- Private key stored in localStorage is not ideal for production
- Acceptable for MVP; future versions should use:
  - Web Crypto API for key storage
  - Hardware-backed keys
  - External signer (Turnkey, etc.)

## UI Components

- `IdentitySetup` — First-time name entry modal
- `ProfileBadge` — Shows current user's name
- `PartnerBadge` — Shows collaborator's name
