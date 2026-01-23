import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Create a new list.
 * The list is created as an Originals asset (assetDid) by the frontend.
 */
export const createList = mutation({
  args: {
    assetDid: v.string(),
    name: v.string(),
    ownerDid: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lists", {
      assetDid: args.assetDid,
      name: args.name,
      ownerDid: args.ownerDid,
      collaboratorDid: undefined,
      createdAt: args.createdAt,
    });
  },
});

/**
 * Get a list by its ID.
 * Returns the list with owner and collaborator info.
 */
export const getList = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.listId);
  },
});

/**
 * Get all lists where user is owner OR collaborator.
 * Supports migrated users by checking both current DID and legacy DID.
 */
export const getUserLists = query({
  args: {
    userDid: v.string(),
    // Optional legacy DID for migrated users (their old localStorage DID)
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // DIDs to check: current DID and optionally legacy DID
    const didsToCheck = [args.userDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    const allLists: Doc<"lists">[] = [];

    // Query for each DID
    for (const did of didsToCheck) {
      // Get lists where user is owner
      const ownedLists = await ctx.db
        .query("lists")
        .withIndex("by_owner", (q) => q.eq("ownerDid", did))
        .collect();

      // Get lists where user is collaborator
      const collaboratorLists = await ctx.db
        .query("lists")
        .withIndex("by_collaborator", (q) => q.eq("collaboratorDid", did))
        .collect();

      // Add to results, avoiding duplicates
      for (const list of [...ownedLists, ...collaboratorLists]) {
        if (!allLists.find((l) => l._id === list._id)) {
          allLists.push(list);
        }
      }
    }

    // Sort by createdAt descending (newest first)
    return allLists.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Delete a list and all its items and pending invites.
 * Only the owner can delete a list.
 * Supports migrated users by checking both current DID and legacy DID.
 */
export const deleteList = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    // Optional legacy DID for migrated users
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Check ownership against current DID or legacy DID
    const isOwner =
      list.ownerDid === args.userDid ||
      (args.legacyDid && list.ownerDid === args.legacyDid);

    if (!isOwner) {
      throw new Error("Only the list owner can delete this list");
    }

    // Delete all items in the list
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete all pending invites for this list
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    // Delete the list itself
    await ctx.db.delete(args.listId);
  },
});

/**
 * Add a collaborator to a list.
 * Used when accepting an invite.
 */
export const addCollaborator = mutation({
  args: {
    listId: v.id("lists"),
    collaboratorDid: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Check if list already has a collaborator (max 2 users for v1)
    if (list.collaboratorDid) {
      throw new Error("This list already has a collaborator");
    }

    // Check if the collaborator is the owner (can't collaborate with yourself)
    if (list.ownerDid === args.collaboratorDid) {
      throw new Error("Cannot add yourself as a collaborator");
    }

    await ctx.db.patch(args.listId, {
      collaboratorDid: args.collaboratorDid,
    });
  },
});
