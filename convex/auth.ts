/**
 * Auth-related Convex functions for Turnkey authentication.
 *
 * Handles user registration and session management for Turnkey-authenticated users.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Register or update a user after Turnkey authentication.
 *
 * Called after successful OTP verification. Creates a new user if the Turnkey
 * sub-organization ID is not found, otherwise updates the existing user's
 * last login timestamp.
 */
export const upsertUser = mutation({
  args: {
    turnkeySubOrgId: v.string(),
    email: v.string(),
    did: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing user by Turnkey ID
    const existingByTurnkey = await ctx.db
      .query("users")
      .withIndex("by_turnkey_id", (q) => q.eq("turnkeySubOrgId", args.turnkeySubOrgId))
      .first();

    if (existingByTurnkey) {
      // Update last login
      await ctx.db.patch(existingByTurnkey._id, {
        lastLoginAt: Date.now(),
      });
      return existingByTurnkey._id;
    }

    // Check if user exists by DID (potential migration from localStorage)
    const existingByDid = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.did))
      .first();

    if (existingByDid) {
      // Link Turnkey to existing user (migration case)
      await ctx.db.patch(existingByDid._id, {
        turnkeySubOrgId: args.turnkeySubOrgId,
        email: args.email,
        lastLoginAt: Date.now(),
        legacyIdentity: false,
      });
      return existingByDid._id;
    }

    // Create new user
    const displayName = args.displayName ?? args.email.split("@")[0];
    return await ctx.db.insert("users", {
      turnkeySubOrgId: args.turnkeySubOrgId,
      email: args.email,
      did: args.did,
      displayName,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
  },
});

/**
 * Get a user by their Turnkey sub-organization ID.
 */
export const getUserByTurnkeyId = query({
  args: { turnkeySubOrgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_turnkey_id", (q) => q.eq("turnkeySubOrgId", args.turnkeySubOrgId))
      .first();
  },
});

/**
 * Get a user by their email address.
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});
