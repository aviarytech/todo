# Feature: List Management

## Overview

Users can create, view, and manage shared lists. Each list is an Originals asset with verifiable provenance.

## User Stories

### Create List
- **As a** user
- **I want to** create a new shared list
- **So that** I can start tracking items with my partner

### View List
- **As a** user
- **I want to** see all items on my list in real-time
- **So that** I always know what needs to be done/bought

### Delete List
- **As a** list owner
- **I want to** delete a list
- **So that** I can clean up lists I no longer need

## Acceptance Criteria

### Create List
1. User clicks "New List" button
2. User enters list name (e.g., "Groceries", "Weekend Tasks")
3. System creates Originals asset for the list
4. System creates Convex record linked to asset DID
5. User sees empty list ready for items

### View List
1. User navigates to list (via home or direct link)
2. System loads all items from Convex
3. Items display with: name, checked status, who added it
4. Updates appear in real-time without refresh

### Delete List
1. Owner clicks delete on list
2. Confirmation dialog appears
3. On confirm: Convex records deleted, asset marked inactive
4. Both partners see list removed from their home

## Technical Notes

### Originals Asset Structure

```typescript
interface ListAsset {
  did: string;              // did:peer:... or did:webvh:...
  name: string;
  createdBy: string;        // Creator's DID
  collaborators: string[];  // Array of authorized DIDs
  createdAt: string;        // ISO timestamp
}
```

### Convex Schema

```typescript
// lists table
{
  assetDid: string,      // Originals asset DID
  name: string,
  ownerDid: string,
  collaboratorDid: string | null,
  createdAt: number,
}
```

## UI Components

- `CreateListModal` — Form for new list creation
- `ListCard` — Preview card shown on home page
- `ListView` — Main list view with items
- `DeleteListDialog` — Confirmation for deletion
