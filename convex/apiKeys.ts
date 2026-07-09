/**
 * Convex queries/mutations for API-key CRUD.
 *
 * Keys are minted and revoked only via JWT-authed HTTP handlers (apiKeysHttp.ts).
 * These functions never accept or return raw keys — only hashes/prefixes.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Look up a key record by its hash. Returns the row (including revokedAt) or null.
 * Callers must check revokedAt before trusting the key.
 */
export const getByHash = query({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();
  },
});

/**
 * List an owner's active keys. Never returns keyHash.
 */
export const listForOwner = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("apiKeys")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .collect();

    return rows
      .filter((row) => row.revokedAt === undefined)
      .map((row) => ({
        id: row._id,
        prefix: row.prefix,
        label: row.label,
        scopes: row.scopes,
        createdAt: row.createdAt,
      }));
  },
});

/**
 * Insert a new key record. Only the hash/prefix are stored, never the raw key.
 */
export const createKey = mutation({
  args: {
    ownerDid: v.string(),
    keyHash: v.string(),
    prefix: v.string(),
    label: v.string(),
    scopes: v.array(v.string()),
    agentDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("apiKeys", {
      ownerDid: args.ownerDid,
      keyHash: args.keyHash,
      prefix: args.prefix,
      label: args.label,
      scopes: args.scopes,
      agentDid: args.agentDid,
      createdAt: Date.now(),
    });
  },
});

/**
 * Revoke a key, but only if it belongs to the requesting owner.
 */
export const revokeKey = mutation({
  args: { keyId: v.id("apiKeys"), ownerDid: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.keyId);
    if (!row || row.ownerDid !== args.ownerDid) {
      throw new Error("API key not found");
    }
    await ctx.db.patch(args.keyId, { revokedAt: Date.now() });
  },
});
