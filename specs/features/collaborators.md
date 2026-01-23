# Feature: Unlimited Collaborators

## Overview

Remove the 2-person limit on lists. Any number of users can collaborate on a list with different permission levels (owner, editor, viewer).

## User Stories

### Invite Multiple People
- **As a** list owner
- **I want to** invite multiple collaborators
- **So that** families/teams can share a list

### Manage Collaborators
- **As a** list owner
- **I want to** see all collaborators and manage their access
- **So that** I control who can edit my list

### Different Roles
- **As a** list owner
- **I want to** give some people view-only access
- **So that** they can see but not modify the list

## Acceptance Criteria

### Inviting
1. Owner can generate multiple invite links
2. Each invite can specify a role (editor or viewer)
3. Invites work the same as before (token + expiry)
4. No limit on number of collaborators

### Roles
- **Owner:** Full control, can delete list, manage collaborators
- **Editor:** Can add/check/remove items, cannot delete list or manage collaborators
- **Viewer:** Read-only access, sees real-time updates

### Management
1. Owner sees list of all collaborators
2. Owner can change collaborator roles
3. Owner can remove collaborators
4. Collaborators can leave a list voluntarily

### Real-time
1. All collaborators see changes instantly
2. Item attribution shows correct user
3. Collaborator list updates when someone joins/leaves

## Technical Specification

### Schema Changes

```typescript
// convex/schema.ts

// NEW: Collaborators junction table
collaborators: defineTable({
  listId: v.id("lists"),
  userDid: v.string(),
  role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
  joinedAt: v.number(),
  invitedByDid: v.optional(v.string()),
})
  .index("by_list", ["listId"])
  .index("by_user", ["userDid"])
  .index("by_list_user", ["listId", "userDid"]),

// Update lists table - remove collaboratorDid
lists: defineTable({
  assetDid: v.string(),
  name: v.string(),
  ownerDid: v.string(),  // Keep for quick owner lookup
  // REMOVED: collaboratorDid
  categoryId: v.optional(v.id("categories")),
  createdAt: v.number(),
}),

// Update invites to include role
invites: defineTable({
  listId: v.id("lists"),
  token: v.string(),
  role: v.union(v.literal("editor"), v.literal("viewer")), // NEW
  createdAt: v.number(),
  expiresAt: v.number(),
  usedAt: v.optional(v.number()),
  usedByDid: v.optional(v.string()),
}),
```

### Convex Functions

```typescript
// convex/collaborators.ts

// Get all collaborators for a list
export const getListCollaborators = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const collabs = await ctx.db
      .query("collaborators")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .collect();

    // Enrich with user info
    const enriched = await Promise.all(
      collabs.map(async (c) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_did", q => q.eq("did", c.userDid))
          .first();
        return {
          ...c,
          displayName: user?.displayName ?? "Unknown",
          email: user?.email,
        };
      })
    );

    return enriched;
  },
});

// Check user's role on a list
export const getUserRole = query({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", q =>
        q.eq("listId", args.listId).eq("userDid", args.userDid)
      )
      .first();

    return collab?.role ?? null;
  },
});

// Add collaborator (called when invite accepted)
export const addCollaborator = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    invitedByDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already a collaborator
    const existing = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", q =>
        q.eq("listId", args.listId).eq("userDid", args.userDid)
      )
      .first();

    if (existing) {
      throw new Error("User is already a collaborator");
    }

    return await ctx.db.insert("collaborators", {
      listId: args.listId,
      userDid: args.userDid,
      role: args.role,
      joinedAt: Date.now(),
      invitedByDid: args.invitedByDid,
    });
  },
});

// Update collaborator role (owner only)
export const updateCollaboratorRole = mutation({
  args: {
    listId: v.id("lists"),
    collaboratorDid: v.string(),
    newRole: v.union(v.literal("editor"), v.literal("viewer")),
    requesterDid: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify requester is owner
    const requesterRole = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", q =>
        q.eq("listId", args.listId).eq("userDid", args.requesterDid)
      )
      .first();

    if (requesterRole?.role !== "owner") {
      throw new Error("Only owners can change collaborator roles");
    }

    // Find and update collaborator
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", q =>
        q.eq("listId", args.listId).eq("userDid", args.collaboratorDid)
      )
      .first();

    if (!collab) {
      throw new Error("Collaborator not found");
    }

    if (collab.role === "owner") {
      throw new Error("Cannot change owner's role");
    }

    await ctx.db.patch(collab._id, { role: args.newRole });
  },
});

// Remove collaborator (owner or self)
export const removeCollaborator = mutation({
  args: {
    listId: v.id("lists"),
    collaboratorDid: v.string(),
    requesterDid: v.string(),
  },
  handler: async (ctx, args) => {
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", q =>
        q.eq("listId", args.listId).eq("userDid", args.collaboratorDid)
      )
      .first();

    if (!collab) {
      throw new Error("Collaborator not found");
    }

    // Owner can remove anyone, users can remove themselves
    if (args.requesterDid !== args.collaboratorDid) {
      const requesterRole = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", q =>
          q.eq("listId", args.listId).eq("userDid", args.requesterDid)
        )
        .first();

      if (requesterRole?.role !== "owner") {
        throw new Error("Only owners can remove other collaborators");
      }
    }

    if (collab.role === "owner") {
      throw new Error("Cannot remove the owner");
    }

    await ctx.db.delete(collab._id);
  },
});
```

### Migration

When upgrading from MVP:
1. For each existing list with `collaboratorDid`:
   - Insert owner into collaborators table with role "owner"
   - Insert collaboratorDid into collaborators table with role "editor"
2. Remove `collaboratorDid` field from lists

```typescript
// convex/migrations/migrateCollaborators.ts
export const migrateToCollaborators = mutation({
  handler: async (ctx) => {
    const lists = await ctx.db.query("lists").collect();

    for (const list of lists) {
      // Add owner
      await ctx.db.insert("collaborators", {
        listId: list._id,
        userDid: list.ownerDid,
        role: "owner",
        joinedAt: list.createdAt,
      });

      // Add existing collaborator if any
      if (list.collaboratorDid) {
        await ctx.db.insert("collaborators", {
          listId: list._id,
          userDid: list.collaboratorDid,
          role: "editor",
          joinedAt: Date.now(), // Unknown original join time
          invitedByDid: list.ownerDid,
        });
      }
    }
  },
});
```

## UI Components

### CollaboratorList
- Shows all collaborators with avatars/names
- Role badges (owner/editor/viewer)
- Remove button for owner
- Leave button for self

### InviteModal (updated)
- Role selector (editor/viewer)
- Shows pending invites
- Revoke invite option

### RoleSelector
- Dropdown to change collaborator role
- Only visible to owner

## Authorization Helper

```typescript
// src/lib/permissions.ts

export type Role = "owner" | "editor" | "viewer";

export function canEdit(role: Role | null): boolean {
  return role === "owner" || role === "editor";
}

export function canManageCollaborators(role: Role | null): boolean {
  return role === "owner";
}

export function canDeleteList(role: Role | null): boolean {
  return role === "owner";
}
```
