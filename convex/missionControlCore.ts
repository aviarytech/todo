import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type Scope =
  | "tasks:read"
  | "tasks:write"
  | "activity:read"
  | "memory:read"
  | "memory:write"
  | "agents:read"
  | "agents:write";

async function hasListAccess(ctx: any, listId: Id<"lists">, userDid: string) {
  const list = await ctx.db.get(listId);
  if (!list) return false;
  if (list.ownerDid === userDid) return true;

  const pub = await ctx.db
    .query("publications")
    .withIndex("by_list", (q: any) => q.eq("listId", listId))
    .first();

  return pub?.status === "active";
}

export const upsertAgentProfile = mutation({
  args: {
    ownerDid: v.string(),
    agentSlug: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner_slug", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        description: args.description,
        capabilities: args.capabilities,
        metadata: args.metadata,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("agentProfiles", {
      ownerDid: args.ownerDid,
      agentSlug: args.agentSlug,
      displayName: args.displayName,
      description: args.description,
      capabilities: args.capabilities,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getAgentProfile = query({
  args: { ownerDid: v.string(), agentSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner_slug", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug))
      .first();
  },
});

export const listAgentProfiles = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("agentProfiles").withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid)).collect();
  },
});

export const createApiKeyRecord = mutation({
  args: {
    ownerDid: v.string(),
    label: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
    agentProfileId: v.optional(v.id("agentProfiles")),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("apiKeys", {
      ownerDid: args.ownerDid,
      label: args.label,
      keyPrefix: args.keyPrefix,
      keyHash: args.keyHash,
      scopes: args.scopes,
      agentProfileId: args.agentProfileId,
      createdAt: now,
      lastUsedAt: undefined,
      revokedAt: undefined,
      expiresAt: args.expiresAt,
    });
  },
});

export const listApiKeys = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("apiKeys").withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid)).collect();
  },
});

export const getApiKeyByHash = query({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("apiKeys").withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash)).first();
  },
});

export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys"), ownerDid: v.string() },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key || key.ownerDid !== args.ownerDid) throw new Error("API key not found");
    await ctx.db.patch(args.keyId, { revokedAt: Date.now() });
    return { ok: true };
  },
});

export const touchApiKeyUsage = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
    return { ok: true };
  },
});

export const listTasksForList = query({
  args: { listId: v.id("lists"), userDid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const ok = await hasListAccess(ctx, args.listId, args.userDid);
    if (!ok) throw new Error("Not authorized");

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
    return await ctx.db.query("items").withIndex("by_list", (q) => q.eq("listId", args.listId)).take(limit);
  },
});

export const getTaskById = query({
  args: { itemId: v.id("items"), userDid: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    const ok = await hasListAccess(ctx, item.listId, args.userDid);
    if (!ok) throw new Error("Not authorized");
    return item;
  },
});

export const addAgentMemory = mutation({
  args: {
    ownerDid: v.string(),
    listId: v.optional(v.id("lists")),
    agentSlug: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.listId) {
      const ok = await hasListAccess(ctx, args.listId, args.ownerDid);
      if (!ok) throw new Error("Not authorized");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("agentMemory")
      .withIndex("by_owner_agent_key", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug).eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, listId: args.listId, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("agentMemory", {
      ownerDid: args.ownerDid,
      listId: args.listId,
      agentSlug: args.agentSlug,
      key: args.key,
      value: args.value,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getAgentMemory = query({
  args: { ownerDid: v.string(), agentSlug: v.string(), key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.key) {
      return await ctx.db
        .query("agentMemory")
        .withIndex("by_owner_agent_key", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug).eq("key", args.key!))
        .first();
    }

    return await ctx.db
      .query("agentMemory")
      .withIndex("by_owner_agent", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug))
      .collect();
  },
});

export const listActivityEvents = query({
  args: { listId: v.id("lists"), userDid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const ok = await hasListAccess(ctx, args.listId, args.userDid);
    if (!ok) throw new Error("Not authorized");

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
    return await ctx.db
      .query("activityEvents")
      .withIndex("by_list_created", (q) => q.eq("listId", args.listId))
      .order("desc")
      .take(limit);
  },
});
