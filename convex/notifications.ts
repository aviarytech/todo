/**
 * Push notification subscriptions and management.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save a push subscription for a user.
 */
export const saveSubscription = mutation({
  args: {
    userDid: v.string(),
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        userDid: args.userDid,
        keys: args.keys,
      });
      return existing._id;
    }

    // Create new subscription
    return await ctx.db.insert("pushSubscriptions", {
      userDid: args.userDid,
      endpoint: args.endpoint,
      keys: args.keys,
      createdAt: Date.now(),
    });
  },
});

/**
 * Remove a push subscription.
 */
export const removeSubscription = mutation({
  args: {
    endpoint: v.string(),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (subscription && subscription.userDid === args.userDid) {
      await ctx.db.delete(subscription._id);
    }
  },
});

/**
 * Get user's push subscriptions.
 */
export const getUserSubscriptions = query({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userDid", args.userDid))
      .collect();
  },
});

/**
 * Check if user has any push subscriptions.
 */
export const hasSubscription = query({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userDid", args.userDid))
      .first();
    return sub !== null;
  },
});

/**
 * Get all subscriptions for users in a list (for sending notifications).
 */
export const getListUserSubscriptions = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    // Get all collaborators
    const collaborators = await ctx.db
      .query("collaborators")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const subscriptions = [];
    for (const collab of collaborators) {
      const userSubs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_user", (q) => q.eq("userDid", collab.userDid))
        .collect();
      subscriptions.push(...userSubs);
    }

    return subscriptions;
  },
});
