/**
 * Queries for serving list resources publicly.
 *
 * These are used by the HTTP handlers to serve lists as Originals resources
 * at /{userPath}/resources/list-{id}.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Get a list by its Convex ID, verifying ownership by DID.
 * Returns null if not found or owner doesn't match.
 */
export const getPublicList = query({
  args: {
    listId: v.string(),
    ownerDid: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to normalize the listId to a Convex ID
    let list;
    try {
      list = await ctx.db.get(args.listId as Id<"lists">);
    } catch {
      // Invalid ID format
      return null;
    }

    if (!list || list.ownerDid !== args.ownerDid) {
      return null;
    }

    return list;
  },
});

/**
 * Get all items for a list (public view — no auth required).
 * Only returns non-sensitive fields.
 */
export const getPublicListItems = query({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Sort by order, then createdAt
    items.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.createdAt - b.createdAt;
    });

    // Only return top-level items (no sub-items) for the resource view
    return items
      .filter((item) => !item.parentId)
      .map((item) => ({
        _id: item._id,
        name: item.name,
        checked: item.checked,
        createdAt: item.createdAt,
        checkedAt: item.checkedAt,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate,
        order: item.order,
      }));
  },
});

/**
 * Check an item on a shared list (no auth — anyone with the link can interact).
 */
export const checkSharedItem = mutation({
  args: {
    itemId: v.string(),
    listId: v.id("lists"),
    actorDid: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId as Id<"items">);
    if (!item || item.listId !== args.listId) {
      throw new Error("Item not found");
    }
    await ctx.db.patch(item._id, {
      checked: true,
      checkedAt: Date.now(),
      checkedByDid: args.actorDid,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Uncheck an item on a shared list.
 */
export const uncheckSharedItem = mutation({
  args: {
    itemId: v.string(),
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId as Id<"items">);
    if (!item || item.listId !== args.listId) {
      throw new Error("Item not found");
    }
    await ctx.db.patch(item._id, {
      checked: false,
      checkedAt: undefined,
      checkedByDid: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Add an item to a shared list.
 */
export const addSharedItem = mutation({
  args: {
    listId: v.id("lists"),
    name: v.string(),
    actorDid: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    // Get max order
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const maxOrder = items.reduce((max, item) => Math.max(max, item.order ?? 0), 0);

    return await ctx.db.insert("items", {
      listId: args.listId,
      name: args.name,
      checked: false,
      createdByDid: args.actorDid,
      createdAt: Date.now(),
      order: maxOrder + 1,
    });
  },
});
