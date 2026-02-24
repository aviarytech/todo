/**
 * Poo App Database Schema
 *
 * Core tables for the collaborative list-sharing app with DID-based identity.
 * Uses Convex for real-time sync and offline support.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // DID logs table - stores did:webvh logs for resolution
  didLogs: defineTable({
    userDid: v.string(), // The user's did:webvh
    path: v.string(), // URL path slug (e.g. "user-abc123")
    log: v.string(), // JSONL content (one JSON object per line)
    updatedAt: v.number(),
  })
    .index("by_path", ["path"])
    .index("by_user_did", ["userDid"]),

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
    did: v.optional(v.string()), // did:webvh:... created client-side (null until first login completes)
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

  // Bookmarks table - tracks which published lists a user has bookmarked
  bookmarks: defineTable({
    userDid: v.string(),
    listId: v.id("lists"),
    bookmarkedAt: v.number(),
  })
    .index("by_user", ["userDid"])
    .index("by_user_list", ["userDid", "listId"]),

  // Lists table - each list is an Originals asset
  lists: defineTable({
    assetDid: v.string(), // Originals asset DID (did:peer or did:webvh)
    name: v.string(),
    ownerDid: v.string(), // Creator's DID
    categoryId: v.optional(v.id("categories")), // User's category for this list (Phase 2)
    createdAt: v.number(),
    // VC proof for list ownership (Phase 6 - Provenance Chain)
    vcProof: v.optional(v.object({
      type: v.string(), // e.g., "VerifiableCredential"
      issuer: v.string(), // DID of issuer
      issuanceDate: v.number(), // When VC was issued
      credentialSubject: v.object({
        id: v.string(), // Subject DID (list assetDid)
        ownerDid: v.string(), // Owner DID
      }),
      proof: v.optional(v.string()), // JWT or linked data proof
    })),
    // Custom grocery aisles created by users for this list
    customAisles: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      emoji: v.string(),
      order: v.number(),
    }))),
    // Item view mode preference: "alphabetical" (flat A-Z) or "categorized" (grouped by category)
    itemViewMode: v.optional(v.union(v.literal("alphabetical"), v.literal("categorized"))),
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
    // New fields for enhanced items
    description: v.optional(v.string()), // Notes/details for the item
    dueDate: v.optional(v.number()), // Due date timestamp
    url: v.optional(v.string()), // Link to PR, URL, or reference
    recurrence: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.optional(v.number()), // Every N days/weeks/months (default 1)
      nextDue: v.optional(v.number()), // Next occurrence timestamp
      endDate: v.optional(v.number()), // Optional end date - stop recurring after this
    })),
    // Priority levels (high/medium/low)
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    // Tags - array of tag IDs
    tags: v.optional(v.array(v.id("tags"))),
    // Grocery aisle override — user-assigned aisle that takes priority over keyword auto-classification
    groceryAisle: v.optional(v.string()),
    // Parent item ID for sub-items
    parentId: v.optional(v.id("items")),
    // Optional assignee DID for Mission Control workflows
    assigneeDid: v.optional(v.string()),
    // Attachments - stored file IDs
    attachments: v.optional(v.array(v.id("_storage"))),
    // VC proofs for item actions (Phase 6 - Provenance Chain)
    vcProofs: v.optional(v.array(v.object({
      type: v.string(), // e.g., "ItemCreation", "ItemCompletion"
      issuer: v.string(), // DID of issuer
      issuanceDate: v.number(), // When action VC was issued
      action: v.string(), // "created", "completed", "modified"
      actorDid: v.string(), // Who performed the action
      proof: v.optional(v.string()), // JWT or linked data proof
    }))),
  })
    .index("by_list", ["listId"])
    .index("by_parent", ["parentId"])
    .index("by_due_date", ["listId", "dueDate"]),

  // Tags table - for categorizing items
  tags: defineTable({
    listId: v.id("lists"),
    name: v.string(),
    color: v.string(), // Hex color code
    createdByDid: v.string(),
    createdAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_name", ["listId", "name"]),

  // List templates table - save lists as reusable templates
  listTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerDid: v.string(),
    items: v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
      order: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    isPublic: v.optional(v.boolean()), // Allow others to use this template
  })
    .index("by_owner", ["ownerDid"])
    .index("by_public", ["isPublic"]),

  // Push notification subscriptions (web push)
  pushSubscriptions: defineTable({
    userDid: v.string(),
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
    createdAt: v.number(),
  })
    .index("by_user", ["userDid"])
    .index("by_endpoint", ["endpoint"]),

  // Push tokens (native iOS APNs + Android/Web)
  pushTokens: defineTable({
    userDid: v.string(),
    token: v.string(), // APNs device token or web push endpoint
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
    // For web push, store subscription details
    webPushKeys: v.optional(v.object({
      p256dh: v.string(),
      auth: v.string(),
    })),
    createdAt: v.number(),
  })
    .index("by_user", ["userDid"])
    .index("by_token", ["token"]),

  // Mission Control activity feed events (Phase 1 runtime wiring)
  activityEvents: defineTable({
    listId: v.id("lists"),
    itemId: v.optional(v.id("items")),
    eventType: v.union(
      v.literal("created"),
      v.literal("completed"),
      v.literal("uncompleted"),
      v.literal("assigned"),
      v.literal("commented"),
      v.literal("edited")
    ),
    actorDid: v.string(),
    assigneeDid: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_list_created", ["listId", "createdAt"])
    .index("by_item_created", ["itemId", "createdAt"]),

  // Mission Control presence sessions with TTL-like expiry tracking
  presenceSessions: defineTable({
    listId: v.id("lists"),
    userDid: v.string(),
    sessionId: v.string(),
    lastSeenAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_expires", ["listId", "expiresAt"])
    .index("by_session", ["sessionId"]),

  // Publications table - did:webvh publication tracking (Phase 4)
  publications: defineTable({
    listId: v.id("lists"),
    webvhDid: v.string(), // did:webvh:...
    publishedAt: v.number(),
    publishedByDid: v.string(), // Owner who published
    status: v.union(v.literal("active"), v.literal("unpublished")),
    didDocument: v.optional(v.string()), // Cached DID document JSON
    didLog: v.optional(v.string()), // DID log for verification
    // Bitcoin anchor tracking
    anchorStatus: v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("none"))),
    anchorTxId: v.optional(v.string()), // Bitcoin transaction ID
    anchorBlockHeight: v.optional(v.number()), // Block height where anchor was confirmed
    anchorTimestamp: v.optional(v.number()), // When anchor was confirmed
  })
    .index("by_list", ["listId"])
    .index("by_webvh_did", ["webvhDid"])
    .index("by_status", ["status"]),

  // Comments table - threaded discussions on items
  comments: defineTable({
    itemId: v.id("items"),
    userDid: v.string(), // Author of the comment
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_item", ["itemId"])
    .index("by_user", ["userDid"]),

  // Bitcoin anchors table - list/item state anchored to Bitcoin signet (Phase 5 + 6)
  bitcoinAnchors: defineTable({
    // Reference to what is being anchored (list or item)
    listId: v.optional(v.id("lists")),
    itemId: v.optional(v.id("items")),
    // State hash and snapshot
    contentHash: v.string(), // SHA-256 hash of list/item state at anchor time
    stateSnapshot: v.optional(v.string()), // JSON of state at anchor time (for verification)
    // Network and status
    network: v.optional(v.union(v.literal("signet"), v.literal("mainnet"), v.literal("regtest"))),
    status: v.union(
      v.literal("pending"), // Anchor requested, awaiting inscription
      v.literal("inscribed"), // Successfully inscribed on Bitcoin
      v.literal("confirmed"), // Inscription confirmed (1+ blocks)
      v.literal("failed") // Inscription failed
    ),
    // Bitcoin transaction data (populated after inscription)
    txid: v.optional(v.string()), // Bitcoin transaction ID
    inscriptionId: v.optional(v.string()), // Ordinals inscription ID
    blockHeight: v.optional(v.number()), // Block height when confirmed
    confirmations: v.optional(v.number()), // Number of confirmations
    // Metadata
    requestedByDid: v.string(), // User who triggered the anchor
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    inscribedAt: v.optional(v.number()), // When inscribed to mempool
    confirmedAt: v.optional(v.number()), // When confirmed on-chain
    // Error info for failed anchors
    error: v.optional(v.string()),
  })
    .index("by_list", ["listId"])
    .index("by_item", ["itemId"])
    .index("by_status", ["status"])
    .index("by_txid", ["txid"])
    .index("by_list_created", ["listId", "createdAt"]),
});
