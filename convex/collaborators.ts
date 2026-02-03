import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all collaborators for a list with enriched user info.
 */
export const getListCollaborators = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const collabs = await ctx.db
      .query("collaborators")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Enrich with user info
    const enriched = await Promise.all(
      collabs.map(async (c) => {
        // Try current DID first
        let user = await ctx.db
          .query("users")
          .withIndex("by_did", (q) => q.eq("did", c.userDid))
          .first();

        // If not found, try legacy DID
        if (!user) {
          user = await ctx.db
            .query("users")
            .withIndex("by_legacy_did", (q) => q.eq("legacyDid", c.userDid))
            .first();
        }

        return {
          _id: c._id,
          listId: c.listId,
          userDid: c.userDid,
          role: c.role,
          joinedAt: c.joinedAt,
          invitedByDid: c.invitedByDid,
          displayName: user?.displayName ?? "Unknown",
          email: user?.email,
        };
      })
    );

    // Sort: owner first, then by joinedAt
    return enriched.sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return a.joinedAt - b.joinedAt;
    });
  },
});

/**
 * Check user's role on a list.
 * Returns the role or null if user is not a collaborator.
 * Supports legacy DIDs for migrated users.
 */
export const getUserRole = query({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check current DID
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", (q) =>
        q.eq("listId", args.listId).eq("userDid", args.userDid)
      )
      .first();

    if (collab) {
      return collab.role;
    }

    // Check legacy DID if provided
    if (args.legacyDid) {
      const legacyDid = args.legacyDid; // Type narrowing
      const legacyCollab = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.listId).eq("userDid", legacyDid)
        )
        .first();

      if (legacyCollab) {
        return legacyCollab.role;
      }
    }

    return null;
  },
});

/**
 * Get all lists where user is a collaborator.
 * Supports legacy DIDs for migrated users.
 */
export const getUserCollaborations = query({
  args: {
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const didsToCheck = [args.userDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    const collabMap = new Map<
      string,
      { listId: string; role: "owner" | "editor" | "viewer" }
    >();

    for (const did of didsToCheck) {
      const collabs = await ctx.db
        .query("collaborators")
        .withIndex("by_user", (q) => q.eq("userDid", did))
        .collect();

      for (const c of collabs) {
        // Use first found (current DID takes precedence if both match)
        if (!collabMap.has(c.listId.toString())) {
          collabMap.set(c.listId.toString(), {
            listId: c.listId.toString(),
            role: c.role,
          });
        }
      }
    }

    return Array.from(collabMap.values());
  },
});

/**
 * Add a collaborator to a list.
 * Called when accepting an invite or by owner directly adding someone.
 */
export const addCollaborator = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    invitedByDid: v.optional(v.string()),
    joinedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if user is already a collaborator
    const existing = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", (q) =>
        q.eq("listId", args.listId).eq("userDid", args.userDid)
      )
      .first();

    if (existing) {
      throw new Error("User is already a collaborator on this list");
    }

    // Verify the list exists
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Check if user is the owner (can't add owner as collaborator again)
    if (list.ownerDid === args.userDid) {
      throw new Error("Cannot add owner as a collaborator");
    }

    return await ctx.db.insert("collaborators", {
      listId: args.listId,
      userDid: args.userDid,
      role: args.role,
      joinedAt: args.joinedAt,
      invitedByDid: args.invitedByDid,
    });
  },
});

/**
 * Update a collaborator's role (owner only).
 * Cannot change owner's role or demote owner.
 */
export const updateCollaboratorRole = mutation({
  args: {
    listId: v.id("lists"),
    collaboratorDid: v.string(),
    newRole: v.union(v.literal("editor"), v.literal("viewer")),
    requesterDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify requester is owner
    const didsToCheck = [args.requesterDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    let isOwner = false;
    for (const did of didsToCheck) {
      const requesterCollab = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.listId).eq("userDid", did)
        )
        .first();

      if (requesterCollab?.role === "owner") {
        isOwner = true;
        break;
      }
    }

    if (!isOwner) {
      throw new Error("Only owners can change collaborator roles");
    }

    // Find the collaborator to update
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", (q) =>
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

/**
 * Remove a collaborator from a list.
 * Owner can remove anyone (except themselves).
 * Users can remove themselves (leave list).
 */
export const removeCollaborator = mutation({
  args: {
    listId: v.id("lists"),
    collaboratorDid: v.string(),
    requesterDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the collaborator to remove
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", (q) =>
        q.eq("listId", args.listId).eq("userDid", args.collaboratorDid)
      )
      .first();

    if (!collab) {
      throw new Error("Collaborator not found");
    }

    if (collab.role === "owner") {
      throw new Error("Cannot remove the owner from the list");
    }

    // Check if requester is the collaborator themselves (leaving) or owner (removing)
    const didsToCheck = [args.requesterDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    const isSelf = didsToCheck.includes(args.collaboratorDid);

    if (!isSelf) {
      // Not removing self, must be owner
      let isOwner = false;
      for (const did of didsToCheck) {
        const requesterCollab = await ctx.db
          .query("collaborators")
          .withIndex("by_list_user", (q) =>
            q.eq("listId", args.listId).eq("userDid", did)
          )
          .first();

        if (requesterCollab?.role === "owner") {
          isOwner = true;
          break;
        }
      }

      if (!isOwner) {
        throw new Error("Only owners can remove other collaborators");
      }
    }

    await ctx.db.delete(collab._id);
  },
});

/**
 * Check if user has edit access (owner or editor).
 * Used by item mutations for authorization.
 */
export const canUserEdit = query({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const didsToCheck = [args.userDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    for (const did of didsToCheck) {
      const collab = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.listId).eq("userDid", did)
        )
        .first();

      if (collab && (collab.role === "owner" || collab.role === "editor")) {
        return true;
      }
    }

    return false;
  },
});
