import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Register a new user with their DID and display name.
 * Creates a user record in Convex for display name lookup.
 */
export const registerUser = mutation({
  args: {
    did: v.string(),
    displayName: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.did))
      .first();

    if (existing) {
      // Update display name if user exists
      await ctx.db.patch(existing._id, { displayName: args.displayName });
      return existing._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      did: args.did,
      displayName: args.displayName,
      createdAt: args.createdAt,
    });
  },
});

/**
 * Get a user by their DID.
 */
export const getUser = query({
  args: { did: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.did))
      .first();
  },
});

/**
 * Batch lookup users by DIDs.
 * Returns a map of DID -> user for displaying collaborator names.
 */
export const getUsersByDids = query({
  args: { dids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const users: Record<string, { did: string; displayName: string }> = {};

    for (const did of args.dids) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_did", (q) => q.eq("did", did))
        .first();

      if (user) {
        users[did] = { did: user.did, displayName: user.displayName };
      }
    }

    return users;
  },
});
