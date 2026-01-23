import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Collaborator roles
export const roleValidator = v.union(
  v.literal("owner"),
  v.literal("editor"),
  v.literal("viewer")
);

export default defineSchema({
  // Users table - for display name lookup by DID
  users: defineTable({
    did: v.string(), // did:peer:... from Originals SDK or Turnkey
    displayName: v.string(),
    createdAt: v.number(),
    // Turnkey auth fields (added in Phase 1.3)
    turnkeySubOrgId: v.optional(v.string()), // Turnkey sub-organization ID
    email: v.optional(v.string()), // User's email address
    lastLoginAt: v.optional(v.number()), // Last login timestamp
    legacyIdentity: v.optional(v.boolean()), // true if still using localStorage
    // Migration support (Phase 1.6)
    legacyDid: v.optional(v.string()), // Original localStorage DID before Turnkey migration
  })
    .index("by_did", ["did"])
    .index("by_turnkey_id", ["turnkeySubOrgId"])
    .index("by_email", ["email"])
    .index("by_legacy_did", ["legacyDid"]),

  // Categories table - user-specific list organization (Phase 2)
  categories: defineTable({
    ownerDid: v.string(), // User who owns this category
    name: v.string(),
    order: v.number(), // Sort order (lower = first)
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerDid"])
    .index("by_owner_name", ["ownerDid", "name"]),

  // Collaborators junction table - unlimited collaborators per list (Phase 3)
  collaborators: defineTable({
    listId: v.id("lists"),
    userDid: v.string(),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
    joinedAt: v.number(),
    invitedByDid: v.optional(v.string()), // Who sent the invite
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userDid"])
    .index("by_list_user", ["listId", "userDid"]),

  // Lists table - each list is an Originals asset
  lists: defineTable({
    assetDid: v.string(), // Originals asset DID (did:peer or did:webvh)
    name: v.string(),
    ownerDid: v.string(), // Creator's DID
    collaboratorDid: v.optional(v.string()), // Partner's DID (max 1 for v1)
    categoryId: v.optional(v.id("categories")), // User's category for this list (Phase 2)
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerDid"])
    .index("by_collaborator", ["collaboratorDid"])
    .index("by_asset_did", ["assetDid"])
    .index("by_category", ["categoryId"]),

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
    role: v.optional(v.union(v.literal("editor"), v.literal("viewer"))), // Role granted on accept (Phase 3, optional for backwards compat)
    createdAt: v.number(),
    expiresAt: v.number(), // createdAt + 24 hours
    usedAt: v.optional(v.number()),
    usedByDid: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_list", ["listId"]),
});
