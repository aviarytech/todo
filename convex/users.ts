/**
 * User-related queries and mutations.
 * Provides user statistics and profile information.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Look up display names for a list of DIDs.
 * Returns a map of DID -> { displayName, email }.
 */
export const getUsersByDids = query({
  args: {
    dids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const result: Record<string, { displayName: string | null; email: string | null }> = {};

    for (const did of args.dids) {
      // Look up user by their DID
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("did"), did))
        .first();

      if (user) {
        result[did] = {
          displayName: user.displayName ?? user.email?.split('@')[0] ?? null,
          email: user.email ?? null,
        };
      } else {
        // Extract a short name from DID for display
        const shortName = did.includes(':') 
          ? did.split(':').pop()?.slice(0, 8) ?? 'Unknown'
          : did.slice(0, 8);
        result[did] = {
          displayName: shortName,
          email: null,
        };
      }
    }

    return result;
  },
});

/**
 * Get aggregate statistics for a user across all their lists.
 */
export const getUserStats = query({
  args: {
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userDid, legacyDid } = args;

    // Get all lists where user is owner
    const ownedLists = await ctx.db
      .query("lists")
      .filter((q) =>
        q.or(
          q.eq(q.field("ownerDid"), userDid),
          legacyDid ? q.eq(q.field("ownerDid"), legacyDid) : q.eq(1, 0)
        )
      )
      .collect();

    // Get bookmarked lists
    const didsToCheck = [userDid];
    if (legacyDid) didsToCheck.push(legacyDid);

    const bookmarkedListIds: Id<"lists">[] = [];
    for (const did of didsToCheck) {
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userDid", did))
        .collect();
      bookmarkedListIds.push(...bookmarks.map((b) => b.listId));
    }

    const ownedListIds = new Set(ownedLists.map((l) => l._id));
    const sharedListIds = bookmarkedListIds.filter((id) => !ownedListIds.has(id));
    
    const allListIds = [...ownedListIds, ...sharedListIds];

    // Count items across all lists
    let totalItems = 0;
    let completedItems = 0;

    for (const listId of allListIds) {
      const items = await ctx.db
        .query("items")
        .withIndex("by_list", (q) => q.eq("listId", listId))
        .collect();

      totalItems += items.length;
      completedItems += items.filter((item) => item.checked).length;
    }

    return {
      totalLists: allListIds.length,
      ownedLists: ownedLists.length,
      sharedLists: sharedListIds.length,
      totalItems,
      completedItems,
      pendingItems: totalItems - completedItems,
    };
  },
});
