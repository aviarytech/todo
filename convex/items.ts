import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

/**
 * Helper to check if a user can edit a list (owner or editor).
 * Checks collaborators table first, then falls back to legacy fields.
 */
async function canUserEditList(
  ctx: MutationCtx | QueryCtx,
  listId: Id<"lists">,
  userDid: string,
  legacyDid?: string
): Promise<boolean> {
  const didsToCheck = [userDid];
  if (legacyDid) {
    didsToCheck.push(legacyDid);
  }

  // Check collaborators table (Phase 3)
  for (const did of didsToCheck) {
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", (q) =>
        q.eq("listId", listId).eq("userDid", did)
      )
      .first();

    if (collab && (collab.role === "owner" || collab.role === "editor")) {
      return true;
    }
  }

  // Fallback: Check legacy fields for unmigrated lists
  const list = await ctx.db.get(listId);
  if (!list) {
    return false;
  }

  for (const did of didsToCheck) {
    if (list.ownerDid === did) {
      return true;
    }
  }

  return false;
}

/**
 * Add an item to a list.
 * Supports legacy DID for migrated users.
 */
export const addItem = mutation({
  args: {
    listId: v.id("lists"),
    name: v.string(),
    createdByDid: v.string(),
    legacyDid: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify the list exists
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify user is authorized (owner or editor)
    const canEdit = await canUserEditList(
      ctx,
      args.listId,
      args.createdByDid,
      args.legacyDid
    );
    if (!canEdit) {
      throw new Error("Not authorized to add items to this list");
    }

    // Get max order to add new item at the end
    const existingItems = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const maxOrder = existingItems.reduce(
      (max, item) => Math.max(max, item.order ?? 0),
      0
    );

    const now = Date.now();
    return await ctx.db.insert("items", {
      listId: args.listId,
      name: args.name,
      checked: false,
      createdByDid: args.createdByDid,
      checkedByDid: undefined,
      createdAt: args.createdAt,
      checkedAt: undefined,
      order: maxOrder + 1,
      updatedAt: now,
    });
  },
});

/**
 * Check (mark as complete) an item.
 * Supports legacy DID for migrated users.
 */
export const checkItem = mutation({
  args: {
    itemId: v.id("items"),
    checkedByDid: v.string(),
    legacyDid: v.optional(v.string()),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user is authorized (owner or editor)
    const canEdit = await canUserEditList(
      ctx,
      item.listId,
      args.checkedByDid,
      args.legacyDid
    );
    if (!canEdit) {
      throw new Error("Not authorized to check items in this list");
    }

    await ctx.db.patch(args.itemId, {
      checked: true,
      checkedByDid: args.checkedByDid,
      checkedAt: args.checkedAt,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Uncheck an item.
 * Supports legacy DID for migrated users.
 */
export const uncheckItem = mutation({
  args: {
    itemId: v.id("items"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user is authorized (owner or editor)
    const canEdit = await canUserEditList(
      ctx,
      item.listId,
      args.userDid,
      args.legacyDid
    );
    if (!canEdit) {
      throw new Error("Not authorized to uncheck items in this list");
    }

    await ctx.db.patch(args.itemId, {
      checked: false,
      checkedByDid: undefined,
      checkedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove an item from a list.
 * Supports legacy DID for migrated users.
 */
export const removeItem = mutation({
  args: {
    itemId: v.id("items"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user is authorized (owner or editor)
    const canEdit = await canUserEditList(
      ctx,
      item.listId,
      args.userDid,
      args.legacyDid
    );
    if (!canEdit) {
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
 * Supports legacy DID for migrated users.
 */
export const reorderItems = mutation({
  args: {
    listId: v.id("lists"),
    itemIds: v.array(v.id("items")),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the list exists
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify user is authorized (owner or editor)
    const canEdit = await canUserEditList(
      ctx,
      args.listId,
      args.userDid,
      args.legacyDid
    );
    if (!canEdit) {
      throw new Error("Not authorized to reorder items in this list");
    }

    // Update order for each item
    for (let i = 0; i < args.itemIds.length; i++) {
      const itemId = args.itemIds[i];
      const item = await ctx.db.get(itemId);

      // Verify item belongs to this list
      if (item && item.listId === args.listId) {
        await ctx.db.patch(itemId, { order: i, updatedAt: Date.now() });
      }
    }
  },
});

/**
 * Get an item by ID for sync conflict checking.
 * Returns null if item doesn't exist (was deleted).
 */
export const getItemForSync = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.itemId);
  },
});
