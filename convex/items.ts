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
    // Optional enhanced fields
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    url: v.optional(v.string()),
    recurrence: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.optional(v.number()),
      nextDue: v.optional(v.number()),
    })),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    parentId: v.optional(v.id("items")), // For sub-items
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

    // If it's a sub-item, verify parent exists and belongs to same list
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.listId !== args.listId) {
        throw new Error("Parent item not found or belongs to different list");
      }
    }

    // Get min order to add new item at the top (for items with same parent)
    const existingItems = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const sameParentItems = existingItems.filter(i => i.parentId === args.parentId);
    const minOrder = sameParentItems.reduce(
      (min, item) => Math.min(min, item.order ?? 0),
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
      order: minOrder - 1,
      updatedAt: now,
      // Enhanced fields
      description: args.description,
      dueDate: args.dueDate,
      url: args.url,
      recurrence: args.recurrence,
      priority: args.priority,
      parentId: args.parentId,
    });
  },
});

/**
 * Update an item's details (name, description, due date, url, recurrence, priority).
 * Supports legacy DID for migrated users.
 */
export const updateItem = mutation({
  args: {
    itemId: v.id("items"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
    // Fields that can be updated
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    url: v.optional(v.string()),
    recurrence: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.optional(v.number()),
      nextDue: v.optional(v.number()),
    })),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    clearDueDate: v.optional(v.boolean()),
    clearRecurrence: v.optional(v.boolean()),
    clearUrl: v.optional(v.boolean()),
    clearPriority: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    const canEdit = await canUserEditList(ctx, item.listId, args.userDid, args.legacyDid);
    if (!canEdit) {
      throw new Error("Not authorized to update this item");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.url !== undefined) updates.url = args.url;
    if (args.recurrence !== undefined) updates.recurrence = args.recurrence;
    if (args.priority !== undefined) updates.priority = args.priority;
    
    // Clear fields if requested
    if (args.clearDueDate) updates.dueDate = undefined;
    if (args.clearRecurrence) updates.recurrence = undefined;
    if (args.clearUrl) updates.url = undefined;
    if (args.clearPriority) updates.priority = undefined;

    await ctx.db.patch(args.itemId, updates);
    return args.itemId;
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

/**
 * Get sub-items for a parent item.
 */
export const getSubItems = query({
  args: { parentId: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

/**
 * Batch check multiple items at once.
 */
export const batchCheckItems = mutation({
  args: {
    itemIds: v.array(v.id("items")),
    checkedByDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const checkedAt = Date.now();
    let listId: Id<"lists"> | null = null;

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) continue;

      // Verify authorization once per list
      if (listId !== item.listId) {
        listId = item.listId;
        const canEdit = await canUserEditList(ctx, item.listId, args.checkedByDid, args.legacyDid);
        if (!canEdit) {
          throw new Error("Not authorized to check items in this list");
        }
      }

      await ctx.db.patch(itemId, {
        checked: true,
        checkedByDid: args.checkedByDid,
        checkedAt,
        updatedAt: checkedAt,
      });
    }
  },
});

/**
 * Batch uncheck multiple items at once.
 */
export const batchUncheckItems = mutation({
  args: {
    itemIds: v.array(v.id("items")),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let listId: Id<"lists"> | null = null;

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) continue;

      if (listId !== item.listId) {
        listId = item.listId;
        const canEdit = await canUserEditList(ctx, item.listId, args.userDid, args.legacyDid);
        if (!canEdit) {
          throw new Error("Not authorized to uncheck items in this list");
        }
      }

      await ctx.db.patch(itemId, {
        checked: false,
        checkedByDid: undefined,
        checkedAt: undefined,
        updatedAt: now,
      });
    }
  },
});

/**
 * Batch delete multiple items at once.
 */
export const batchDeleteItems = mutation({
  args: {
    itemIds: v.array(v.id("items")),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let listId: Id<"lists"> | null = null;

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) continue;

      if (listId !== item.listId) {
        listId = item.listId;
        const canEdit = await canUserEditList(ctx, item.listId, args.userDid, args.legacyDid);
        if (!canEdit) {
          throw new Error("Not authorized to delete items in this list");
        }
      }

      // Also delete any sub-items
      const subItems = await ctx.db
        .query("items")
        .withIndex("by_parent", (q) => q.eq("parentId", itemId))
        .collect();
      
      for (const subItem of subItems) {
        await ctx.db.delete(subItem._id);
      }

      await ctx.db.delete(itemId);
    }
  },
});

/**
 * Get items with due dates for calendar view.
 */
export const getItemsWithDueDates = query({
  args: { 
    listId: v.id("lists"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Filter items with due dates
    let filtered = items.filter((item) => item.dueDate !== undefined);

    // Apply date range filter if provided
    if (args.startDate !== undefined) {
      filtered = filtered.filter((item) => item.dueDate! >= args.startDate!);
    }
    if (args.endDate !== undefined) {
      filtered = filtered.filter((item) => item.dueDate! <= args.endDate!);
    }

    return filtered.sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
  },
});
