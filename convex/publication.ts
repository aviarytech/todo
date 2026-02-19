/**
 * Publication functions for did:webvh public list publishing.
 *
 * Phase 4: List owners can publish lists to did:webvh for public discovery.
 * Published lists are verifiable and can be viewed by anyone.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Record a publication for a list.
 * Only the owner can publish a list.
 */
export const publishList = mutation({
  args: {
    listId: v.id("lists"),
    webvhDid: v.string(),
    didDocument: v.optional(v.string()),
    didLog: v.optional(v.string()),
    publisherDid: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is owner
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }
    if (list.ownerDid !== args.publisherDid) {
      throw new Error("Only the owner can publish a list");
    }

    // Check if already published
    const existing = await ctx.db
      .query("publications")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .first();

    if (existing && existing.status === "active") {
      throw new Error("List is already published");
    }

    if (existing) {
      // Re-publish (update existing record)
      await ctx.db.patch(existing._id, {
        webvhDid: args.webvhDid,
        didDocument: args.didDocument,
        didLog: args.didLog,
        publishedAt: Date.now(),
        status: "active",
      });
      return existing._id;
    }

    // Create new publication
    return await ctx.db.insert("publications", {
      listId: args.listId,
      webvhDid: args.webvhDid,
      didDocument: args.didDocument,
      didLog: args.didLog,
      publishedAt: Date.now(),
      publishedByDid: args.publisherDid,
      status: "active",
    });
  },
});

/**
 * Unpublish a list.
 * Only the owner can unpublish.
 */
export const unpublishList = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }
    if (list.ownerDid !== args.userDid) {
      throw new Error("Only the owner can unpublish a list");
    }

    const pub = await ctx.db
      .query("publications")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .first();

    if (pub) {
      await ctx.db.patch(pub._id, { status: "unpublished" });
    }
  },
});

/**
 * Get a public list by its did:webvh DID.
 * Returns list data, items with attribution, and publication info.
 * No authentication required.
 */
export const getPublicList = query({
  args: { webvhDid: v.string() },
  handler: async (ctx, args) => {
    const pub = await ctx.db
      .query("publications")
      .withIndex("by_webvh_did", (q) => q.eq("webvhDid", args.webvhDid))
      .first();

    if (!pub || pub.status !== "active") {
      return null;
    }

    const list = await ctx.db.get(pub.listId);
    if (!list) return null;

    // Get items
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", pub.listId))
      .collect();

    // Sort by order (if exists) then by creation time
    const sortedItems = items.sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return a.createdAt - b.createdAt;
    });

    // Enrich items with user display names
    const enrichedItems = await Promise.all(
      sortedItems.map(async (item) => {
        const creator = await ctx.db
          .query("users")
          .withIndex("by_did", (q) => q.eq("did", item.createdByDid))
          .first();

        // Also check legacyDid if not found
        const creatorByLegacy = !creator
          ? await ctx.db
              .query("users")
              .withIndex("by_legacy_did", (q) =>
                q.eq("legacyDid", item.createdByDid)
              )
              .first()
          : null;

        const resolvedCreator = creator ?? creatorByLegacy;

        return {
          _id: item._id,
          name: item.name,
          checked: item.checked,
          createdByDid: item.createdByDid,
          createdByName: resolvedCreator?.displayName ?? "Unknown",
          createdAt: item.createdAt,
          checkedAt: item.checkedAt,
          checkedByDid: item.checkedByDid,
        };
      })
    );

    // Get owner info
    const owner = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", list.ownerDid))
      .first();

    return {
      list: {
        _id: list._id,
        name: list.name,
        ownerDid: list.ownerDid,
        ownerName: owner?.displayName ?? "Unknown",
        createdAt: list.createdAt,
        assetDid: list.assetDid,
        customAisles: list.customAisles,
        itemViewMode: list.itemViewMode,
      },
      items: enrichedItems,
      publication: {
        webvhDid: pub.webvhDid,
        publishedAt: pub.publishedAt,
        didDocument: pub.didDocument,
        didLog: pub.didLog,
      },
    };
  },
});

/**
 * Bookmark a published list so it shows in the user's list view.
 */
export const bookmarkList = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify list exists and is published
    const pub = await ctx.db
      .query("publications")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .first();

    if (!pub || pub.status !== "active") {
      throw new Error("List is not published");
    }

    // Check if already bookmarked
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_list", (q) =>
        q.eq("userDid", args.userDid).eq("listId", args.listId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("bookmarks", {
      userDid: args.userDid,
      listId: args.listId,
      bookmarkedAt: Date.now(),
    });
  },
});

/**
 * Remove a bookmark.
 */
export const unbookmarkList = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_list", (q) =>
        q.eq("userDid", args.userDid).eq("listId", args.listId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Check if a list is bookmarked by the user.
 */
export const isBookmarked = query({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_list", (q) =>
        q.eq("userDid", args.userDid).eq("listId", args.listId)
      )
      .first();

    return !!existing;
  },
});

/**
 * Get publication status for a list.
 * Returns publication info if the list is published, null otherwise.
 */
export const getPublicationStatus = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const pub = await ctx.db
      .query("publications")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .first();

    if (!pub) return null;

    return {
      _id: pub._id,
      webvhDid: pub.webvhDid,
      publishedAt: pub.publishedAt,
      status: pub.status,
      publishedByDid: pub.publishedByDid,
      anchorStatus: pub.anchorStatus ?? "none",
      anchorTxId: pub.anchorTxId,
      anchorBlockHeight: pub.anchorBlockHeight,
      anchorTimestamp: pub.anchorTimestamp,
    };
  },
});
