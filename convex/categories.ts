/**
 * Convex functions for category management.
 *
 * Categories are per-user organizational units for lists.
 * Each user has their own categories - a shared list can be in
 * different categories for different users.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all categories for a user, sorted by order.
 */
export const getUserCategories = query({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.userDid))
      .collect();

    // Sort by order
    return categories.sort((a, b) => a.order - b.order);
  },
});

/**
 * Create a new category.
 *
 * Validates that name is unique for the user.
 */
export const createCategory = mutation({
  args: {
    userDid: v.string(),
    name: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Category name cannot be empty");
    }

    // Check for duplicate name
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_owner_name", (q) =>
        q.eq("ownerDid", args.userDid).eq("name", trimmedName)
      )
      .first();

    if (existing) {
      throw new Error("Category with this name already exists");
    }

    // Get max order to place new category at end
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.userDid))
      .collect();

    const maxOrder = categories.reduce((max, c) => Math.max(max, c.order), 0);

    return await ctx.db.insert("categories", {
      ownerDid: args.userDid,
      name: trimmedName,
      order: maxOrder + 1,
      createdAt: args.createdAt,
    });
  },
});

/**
 * Rename a category.
 *
 * Validates ownership and unique name.
 */
export const renameCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    userDid: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    if (category.ownerDid !== args.userDid) {
      throw new Error("Not authorized to modify this category");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Category name cannot be empty");
    }

    // Check for duplicate name (excluding current category)
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_owner_name", (q) =>
        q.eq("ownerDid", args.userDid).eq("name", trimmedName)
      )
      .first();

    if (existing && existing._id !== args.categoryId) {
      throw new Error("Category with this name already exists");
    }

    await ctx.db.patch(args.categoryId, { name: trimmedName });
  },
});

/**
 * Delete a category.
 *
 * Lists in this category are moved to uncategorized (categoryId = undefined).
 */
export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    if (category.ownerDid !== args.userDid) {
      throw new Error("Not authorized to delete this category");
    }

    // Move all lists in this category to uncategorized
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    for (const list of lists) {
      await ctx.db.patch(list._id, { categoryId: undefined });
    }

    await ctx.db.delete(args.categoryId);
  },
});

/**
 * Reorder a category.
 *
 * Updates the order field to move category to new position.
 */
export const reorderCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    userDid: v.string(),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    if (category.ownerDid !== args.userDid) {
      throw new Error("Not authorized to modify this category");
    }

    await ctx.db.patch(args.categoryId, { order: args.newOrder });
  },
});

/**
 * Set a list's category.
 *
 * Pass undefined for categoryId to move to uncategorized.
 * Validates that user has access to the list (owner or collaborator).
 */
export const setListCategory = mutation({
  args: {
    listId: v.id("lists"),
    categoryId: v.optional(v.id("categories")),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Check user has access (owner or collaborator)
    const isOwner =
      list.ownerDid === args.userDid || list.ownerDid === args.legacyDid;
    const isCollaborator =
      list.collaboratorDid === args.userDid ||
      list.collaboratorDid === args.legacyDid;

    if (!isOwner && !isCollaborator) {
      throw new Error("Not authorized to modify this list");
    }

    // If setting a category, verify ownership
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.ownerDid !== args.userDid) {
        throw new Error("Category not found or not owned by user");
      }
    }

    await ctx.db.patch(args.listId, { categoryId: args.categoryId });
  },
});
