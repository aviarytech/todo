# Feature: Shared Lists Display

## Goal
Show lists shared with the user in a separate "Shared with me" section on the dashboard.

## Current Behavior
- `getUserLists` returns ALL lists where user is a collaborator (any role)
- UI shows all lists together under "Your Lists"
- No visual distinction between owned vs joined lists

## Desired Behavior
- Dashboard shows two sections:
  1. **Your Lists** — lists where user is owner
  2. **Shared with me** — lists where user is editor/viewer (not owner)
- Each section groups by category as before
- Shared lists show owner info (who shared it)

## Implementation
1. Modify Home.tsx to split lists by ownership
2. Compare `list.ownerDid` against user's DID(s)
3. Add "Shared with me" section with owner attribution
