import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Collaborator roles
export const roleValidator = v.union(
  v.literal("owner"),
  v.literal("editor"),
  v.literal("viewer")
);

export default defineSchema({
  // Rate limits table - for tracking auth endpoint rate limits (Phase 9.2)
  rateLimits: defineTable({
    key: v.string(), // Unique identifier (IP address or session ID)
    endpoint: v.string(), // Endpoint being limited ("initiate" or "verify")
    attempts: v.number(), // Number of attempts in current window
    windowStart: v.number(), // Timestamp when current window started
    expiresAt: v.number(), // When this record can be cleaned up (windowStart + window duration)
  })
    .index("by_key_endpoint", ["key", "endpoint"])
    .index("by_expires_at", ["expiresAt"]),

  // Auth sessions table - for server-side OTP session storage (Phase 8)
  authSessions: defineTable({
    sessionId: v.string(), // Unique session identifier
    email: v.string(), // User's email address
    subOrgId: v.optional(v.string()), // Turnkey sub-organization ID
    otpId: v.optional(v.string()), // Turnkey OTP ID
    timestamp: v.number(), // Session creation timestamp
    verified: v.boolean(), // Whether OTP has been verified
    expiresAt: v.number(), // Session expiration timestamp
  })
    .index("by_session_id", ["sessionId"])
    .index("by_expires_at", ["expiresAt"]),

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
    categoryId: v.optional(v.id("categories")), // User's category for this list (Phase 2)
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerDid"])
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
    updatedAt: v.optional(v.number()), // Timestamp of last update (Phase 5.8 conflict resolution)
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

  // Publications table - did:webvh publication tracking (Phase 4)
  publications: defineTable({
    listId: v.id("lists"),
    webvhDid: v.string(), // did:webvh:...
    publishedAt: v.number(),
    publishedByDid: v.string(), // Owner who published
    status: v.union(v.literal("active"), v.literal("unpublished")),
    didDocument: v.optional(v.string()), // Cached DID document JSON
    didLog: v.optional(v.string()), // DID log for verification
  })
    .index("by_list", ["listId"])
    .index("by_webvh_did", ["webvhDid"])
    .index("by_status", ["status"]),
});
