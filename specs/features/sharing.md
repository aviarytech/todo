# Feature: Sharing & Invites

## Overview

List owners can invite their partner to collaborate via a shareable link. Once joined, both users have equal permissions.

## User Stories

### Generate Invite Link
- **As a** list owner
- **I want to** generate a shareable invite link
- **So that** my partner can join the list

### Join via Invite
- **As an** invitee
- **I want to** join a list by clicking an invite link
- **So that** I can collaborate with my partner

### View Collaborator
- **As a** list collaborator
- **I want to** see who else is on the list
- **So that** I know I'm sharing with the right person

## Acceptance Criteria

### Generate Invite Link
1. Owner clicks "Share" button on list
2. System generates unique invite token
3. Modal displays copyable link: `app.com/join/[listId]/[token]`
4. Owner can copy link to share via their preferred method
5. Token expires after 24 hours or first use

### Join via Invite
1. Invitee opens invite link
2. If not registered: prompted to create identity (name + DID generated)
3. System validates token (not expired, not used)
4. Invitee's DID added as collaborator
5. Token marked as used
6. Invitee redirected to list view
7. Owner sees new collaborator appear

### View Collaborator
1. List view shows both collaborators' names
2. Can see partner's name on items they created/checked

## Technical Notes

### Invite Token Structure

```typescript
// invites table in Convex
{
  listId: Id<"lists">,
  token: string,          // Random unique string
  createdAt: number,
  expiresAt: number,      // createdAt + 24 hours
  usedAt: number | null,
  usedByDid: string | null,
}
```

### Join Flow

1. `GET /join/:listId/:token` → JoinList page
2. Page calls Convex `validateInvite(listId, token)`
3. If valid and user has identity → `acceptInvite(listId, token, userDid)`
4. If valid and no identity → show registration, then accept
5. If invalid → show error

### Security

- Tokens are cryptographically random (uuid v4 or similar)
- Single-use: once accepted, cannot be reused
- Time-limited: 24-hour expiration
- List limited to 2 collaborators for v1

## UI Components

- `ShareModal` — Shows invite link with copy button
- `JoinList` — Page for accepting invites
- `CollaboratorBadge` — Shows partner info on list view
