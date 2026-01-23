# Feature: Item Management

## Overview

Users can add, check off, and remove items from a shared list. Each action is attributed to the user who performed it.

## User Stories

### Add Item
- **As a** list collaborator
- **I want to** add items to the list
- **So that** my partner knows what we need

### Check Off Item
- **As a** list collaborator
- **I want to** mark items as complete
- **So that** we know what's been done

### Remove Item
- **As a** list collaborator
- **I want to** remove items from the list
- **So that** we can clean up completed or mistaken entries

### See Item Attribution
- **As a** list collaborator
- **I want to** see who added or modified each item
- **So that** I know who to ask about it

## Acceptance Criteria

### Add Item
1. User types item name in input field
2. User presses Enter or clicks Add
3. Item appears immediately (optimistic update)
4. Item shows user's name/avatar as creator
5. Partner sees item appear in real-time

### Check Off Item
1. User clicks checkbox next to item
2. Item visually marked as complete (strikethrough, muted)
3. "Checked by [name]" attribution shown
4. Partner sees update in real-time

### Remove Item
1. User clicks remove/X button on item
2. Item removed immediately (optimistic)
3. Partner sees item disappear in real-time

### Attribution Display
1. Each item shows who added it
2. Checked items show who checked them
3. Attribution includes name and relative time ("Alice, 2m ago")

## Technical Notes

### Convex Schema

```typescript
// items table
{
  listId: Id<"lists">,
  name: string,
  checked: boolean,
  createdByDid: string,
  checkedByDid: string | null,
  createdAt: number,
  checkedAt: number | null,
}
```

### Originals Credential (per action)

```typescript
interface ItemActionCredential {
  type: "ItemAdded" | "ItemChecked" | "ItemRemoved";
  listDid: string;
  itemId: string;
  actor: string;        // DID of user
  timestamp: string;
  signature: string;    // Credential signature
}
```

For v1, credentials are generated but verification is best-effort. Full credential chain verification is a future enhancement.

## UI Components

- `AddItemInput` — Text input with add button
- `ListItem` — Individual item with checkbox, name, attribution, remove button
- `ItemAttribution` — Small component showing who/when
