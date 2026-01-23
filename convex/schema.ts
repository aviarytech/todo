import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - for display name lookup by DID
  users: defineTable({
    did: v.string(), // did:peer:... from Originals SDK
    displayName: v.string(),
    createdAt: v.number(),
  }).index("by_did", ["did"]),

  // Lists table - each list is an Originals asset
  lists: defineTable({
    assetDid: v.string(), // Originals asset DID (did:peer or did:webvh)
    name: v.string(),
    ownerDid: v.string(), // Creator's DID
    collaboratorDid: v.optional(v.string()), // Partner's DID (max 1 for v1)
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerDid"])
    .index("by_collaborator", ["collaboratorDid"])
    .index("by_asset_did", ["assetDid"]),

  // Items table - items within a list
  items: defineTable({
    listId: v.id("lists"),
    name: v.string(),
    checked: v.boolean(),
    createdByDid: v.string(), // DID of user who added item
    checkedByDid: v.optional(v.string()), // DID of user who checked item
    createdAt: v.number(),
    checkedAt: v.optional(v.number()),
    order: v.optional(v.number()), // Position in list (lower = higher in list)
  }).index("by_list", ["listId"]),

  // Invites table - for sharing lists with partners
  invites: defineTable({
    listId: v.id("lists"),
    token: v.string(), // Random unique string (uuid v4)
    createdAt: v.number(),
    expiresAt: v.number(), // createdAt + 24 hours
    usedAt: v.optional(v.number()),
    usedByDid: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_list", ["listId"]),
});
