# Feature: Auto-create did:webvh for Users on Login

## Goal
Automatically create a did:webvh identity for users when they log in, instead of the current did:peer.

## Current Behavior
- On OTP verify, `getOrCreateDID()` creates a `did:peer:2.V...` from Ed25519 key
- This DID is local/ephemeral — not resolvable externally

## Desired Behavior
- On login, create a `did:webvh` DID for the user
- DID should be persisted and associated with the user account
- Requires a domain/slug for the DID (e.g., `did:webvh:originals.org:users:{userId}`)

## Design Decisions
- Domain comes from env var (e.g., `VITE_WEBVH_DOMAIN`)
- Use Originals SDK tools for did:webvh creation/hosting

## Implementation Notes
- `createDIDWithTurnkey` exists in `src/lib/turnkey.ts`
- `createWebvhDID` method exists in `useAuth` but is for publishing
- Check Originals SDK (`@aspect/originals` or similar) for user DID creation helpers
