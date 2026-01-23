import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Add an item to a list.
 */
export const addItem = mutation({
  args: {
    listId: v.id("lists"),
    name: v.string(),
    createdByDid: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify the list exists
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify user is authorized (owner or collaborator)
    if (list.ownerDid !== args.createdByDid && list.collaboratorDid !== args.createdByDid) {
      throw new Error("Not authorized to add items to this list");
    }

    // Get max order to add new item at the end
    const existingItems = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const maxOrder = existingItems.reduce((max, item) => Math.max(max, item.order ?? 0), 0);

    return await ctx.db.insert("items", {
      listId: args.listId,
      name: args.name,
      checked: false,
      createdByDid: args.createdByDid,
      checkedByDid: undefined,
      createdAt: args.createdAt,
      checkedAt: undefined,
      order: maxOrder + 1,
    });
  },
});

/**
 * Check (mark as complete) an item.
 */
export const checkItem = mutation({
  args: {
    itemId: v.id("items"),
    checkedByDid: v.string(),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user is authorized
    const list = await ctx.db.get(item.listId);
    if (!list) {
      throw new Error("List not found");
    }

    if (list.ownerDid !== args.checkedByDid && list.collaboratorDid !== args.checkedByDid) {
      throw new Error("Not authorized to check items in this list");
    }

    await ctx.db.patch(args.itemId, {
      checked: true,
      checkedByDid: args.checkedByDid,
      checkedAt: args.checkedAt,
    });
  },
});

/**
 * Uncheck an item.
 */
export const uncheckItem = mutation({
  args: {
    itemId: v.id("items"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user is authorized
    const list = await ctx.db.get(item.listId);
    if (!list) {
      throw new Error("List not found");
    }

    if (list.ownerDid !== args.userDid && list.collaboratorDid !== args.userDid) {
      throw new Error("Not authorized to uncheck items in this list");
    }

    await ctx.db.patch(args.itemId, {
      checked: false,
      checkedByDid: undefined,
      checkedAt: undefined,
    });
  },
});

/**
 * Remove an item from a list.
 */
export const removeItem = mutation({
  args: {
    itemId: v.id("items"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user is authorized
    const list = await ctx.db.get(item.listId);
    if (!list) {
      throw new Error("List not found");
    }

    if (list.ownerDid !== args.userDid && list.collaboratorDid !== args.userDid) {
      throw new Error("Not authorized to remove items from this list");
    }

    await ctx.db.delete(args.itemId);
  },
});

/**
 * Get all items for a list, ordered by position.
 */
export const getListItems = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Sort by order (items without order fall back to createdAt)
    return items.sort((a, b) => {
      const orderA = a.order ?? a.createdAt;
      const orderB = b.order ?? b.createdAt;
      return orderA - orderB;
    });
  },
});

/**
 * Reorder items in a list.
 * Takes the full ordered list of item IDs and updates their order values.
 */
export const reorderItems = mutation({
  args: {
    listId: v.id("lists"),
    itemIds: v.array(v.id("items")),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the list exists
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify user is authorized
    if (list.ownerDid !== args.userDid && list.collaboratorDid !== args.userDid) {
      throw new Error("Not authorized to reorder items in this list");
    }

    // Update order for each item
    for (let i = 0; i < args.itemIds.length; i++) {
      const itemId = args.itemIds[i];
      const item = await ctx.db.get(itemId);

      // Verify item belongs to this list
      if (item && item.listId === args.listId) {
        await ctx.db.patch(itemId, { order: i });
      }
    }
  },
});
