import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Creates a placeholder Verifiable Credential for list ownership.
 * 
 * This follows the W3C VC Data Model structure but without a cryptographic
 * proof. The proof can be added later when server-side signing is implemented.
 * 
 * @see https://www.w3.org/TR/vc-data-model/
 */
function createListOwnershipVC(
  listId: Id<"lists">,
  assetDid: string,
  ownerDid: string,
  listName: string,
  createdAt: number
): {
  type: string;
  issuer: string;
  issuanceDate: number;
  credentialSubject: { id: string; ownerDid: string };
  proof?: string;
} {
  // Build the full W3C VC for the proof (to be signed later)
  const fullVc = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://originals.tech/credentials/v1"
    ],
    type: ["VerifiableCredential", "ListOwnershipCredential"],
    id: `urn:uuid:${crypto.randomUUID()}`,
    issuer: ownerDid,
    issuanceDate: new Date(createdAt).toISOString(),
    credentialSubject: {
      id: ownerDid,
      listId: listId.toString(),
      assetDid,
      listName,
      role: "owner",
    },
  };

  // Return the structured VC object for storage
  return {
    type: "ListOwnershipCredential",
    issuer: ownerDid,
    issuanceDate: createdAt,
    credentialSubject: {
      id: assetDid,
      ownerDid,
    },
    // Full VC JSON for signing/verification
    proof: JSON.stringify(fullVc),
  };
}

/**
 * Create a new list.
 * The list is created as an Originals asset (assetDid) by the frontend.
 * Also adds the owner to the collaborators table with "owner" role.
 * Issues a Verifiable Credential proving ownership.
 */
export const createList = mutation({
  args: {
    assetDid: v.string(),
    name: v.string(),
    ownerDid: v.string(),
    categoryId: v.optional(v.id("categories")),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Create the list
    const listId = await ctx.db.insert("lists", {
      assetDid: args.assetDid,
      name: args.name,
      ownerDid: args.ownerDid,
      categoryId: args.categoryId,
      createdAt: args.createdAt,
    });

    // Generate a Verifiable Credential proving list ownership
    const vcProof = createListOwnershipVC(
      listId,
      args.assetDid,
      args.ownerDid,
      args.name,
      args.createdAt
    );

    // Update the list with the VC proof
    await ctx.db.patch(listId, { vcProof });

    // Add owner to collaborators table (Phase 3)
    await ctx.db.insert("collaborators", {
      listId,
      userDid: args.ownerDid,
      role: "owner",
      joinedAt: args.createdAt,
      invitedByDid: undefined,
    });

    return listId;
  },
});

/**
 * Rename a list and re-issue its Verifiable Credential with the updated name.
 * Only the owner can rename a list.
 */
export const renameList = mutation({
  args: {
    listId: v.id("lists"),
    name: v.string(),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const didsToCheck = [args.userDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    let isOwner = false;

    for (const did of didsToCheck) {
      const collab = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.listId).eq("userDid", did)
        )
        .first();

      if (collab?.role === "owner") {
        isOwner = true;
        break;
      }
    }

    if (!isOwner) {
      isOwner =
        list.ownerDid === args.userDid ||
        (args.legacyDid !== undefined && list.ownerDid === args.legacyDid);
    }

    if (!isOwner) {
      throw new Error("Only the list owner can rename this list");
    }

    // Re-issue the VC with the new name
    const vcProof = createListOwnershipVC(
      args.listId,
      list.assetDid ?? "",
      list.ownerDid,
      args.name,
      list.createdAt
    );

    await ctx.db.patch(args.listId, {
      name: args.name,
      vcProof,
    });
  },
});

/**
 * Update the category of a list.
 * Only the list owner can change the category.
 */
export const updateListCategory = mutation({
  args: {
    listId: v.id("lists"),
    categoryId: v.optional(v.id("categories")),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const didsToCheck = [args.userDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    let isOwner = false;

    for (const did of didsToCheck) {
      const collab = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.listId).eq("userDid", did)
        )
        .first();

      if (collab?.role === "owner") {
        isOwner = true;
        break;
      }
    }

    if (!isOwner) {
      isOwner =
        list.ownerDid === args.userDid ||
        (args.legacyDid !== undefined && list.ownerDid === args.legacyDid);
    }

    if (!isOwner) {
      throw new Error("Only the list owner can change the category");
    }

    // Validate category exists if provided
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
    }

    await ctx.db.patch(args.listId, {
      categoryId: args.categoryId,
    });
  },
});

/**
 * Get a list by its ID.
 * Returns the list with owner and collaborator info.
 */
export const getList = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.listId);
  },
});

/**
 * Get all lists where user is a collaborator (owner, editor, or viewer).
 * Uses the collaborators table (Phase 3) with fallback to legacy fields.
 * Supports migrated users by checking both current DID and legacy DID.
 */
export const getUserLists = query({
  args: {
    userDid: v.string(),
    // Optional legacy DID for migrated users (their old localStorage DID)
    legacyDid: v.optional(v.string()),
    // Optional wallet DID (client-generated did:peer:xxx, may differ from canonical did:temp:xxx)
    walletDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // DIDs to check: current DID and optionally legacy/wallet DIDs
    const didsToCheck = [args.userDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }
    if (args.walletDid) {
      didsToCheck.push(args.walletDid);
    }

    const listMap = new Map<string, Doc<"lists">>();

    // Primary: Query from collaborators table (Phase 3)
    for (const did of didsToCheck) {
      const collabs = await ctx.db
        .query("collaborators")
        .withIndex("by_user", (q) => q.eq("userDid", did))
        .collect();

      for (const collab of collabs) {
        if (!listMap.has(collab.listId.toString())) {
          const list = await ctx.db.get(collab.listId);
          if (list) {
            listMap.set(collab.listId.toString(), list);
          }
        }
      }
    }

    // Fallback: Also check legacy ownerDid field for unmigrated lists
    for (const did of didsToCheck) {
      // Get lists where user is owner (legacy field)
      const ownedLists = await ctx.db
        .query("lists")
        .withIndex("by_owner", (q) => q.eq("ownerDid", did))
        .collect();

      // Add to results, avoiding duplicates
      for (const list of ownedLists) {
        if (!listMap.has(list._id.toString())) {
          listMap.set(list._id.toString(), list);
        }
      }
    }

    // Convert to array and sort by createdAt descending (newest first)
    return Array.from(listMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

/**
 * Delete a list and all its items, invites, and collaborators.
 * Only the owner can delete a list.
 * Supports migrated users by checking both current DID and legacy DID.
 */
export const deleteList = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    // Optional legacy DID for migrated users
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Check ownership via collaborators table first (Phase 3)
    const didsToCheck = [args.userDid];
    if (args.legacyDid) {
      didsToCheck.push(args.legacyDid);
    }

    let isOwner = false;

    // Check collaborators table
    for (const did of didsToCheck) {
      const collab = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.listId).eq("userDid", did)
        )
        .first();

      if (collab?.role === "owner") {
        isOwner = true;
        break;
      }
    }

    // Fallback: Check legacy ownerDid field
    if (!isOwner) {
      isOwner =
        list.ownerDid === args.userDid ||
        (args.legacyDid !== undefined && list.ownerDid === args.legacyDid);
    }

    if (!isOwner) {
      throw new Error("Only the list owner can delete this list");
    }

    // Delete all items in the list
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete all pending invites for this list
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    // Delete all collaborators for this list (Phase 3)
    const collaborators = await ctx.db
      .query("collaborators")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const collab of collaborators) {
      await ctx.db.delete(collab._id);
    }

    // Delete the list itself
    await ctx.db.delete(args.listId);
  },
});

/**
 * @deprecated Use collaborators.addCollaborator instead (Phase 3).
 * This function is kept for backwards compatibility with existing invites flow.
 */
export const addCollaborator = mutation({
  args: {
    listId: v.id("lists"),
    collaboratorDid: v.string(),
    role: v.optional(v.union(v.literal("editor"), v.literal("viewer"))),
    invitedByDid: v.optional(v.string()),
    joinedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Check if the collaborator is the owner (can't collaborate with yourself)
    if (list.ownerDid === args.collaboratorDid) {
      throw new Error("Cannot add yourself as a collaborator");
    }

    // Check if already exists in collaborators table
    const existingCollab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", (q) =>
        q.eq("listId", args.listId).eq("userDid", args.collaboratorDid)
      )
      .first();

    if (existingCollab) {
      throw new Error("User is already a collaborator on this list");
    }

    const role = args.role ?? "editor";
    const joinedAt = args.joinedAt ?? Date.now();

    // Add to collaborators table (Phase 3)
    await ctx.db.insert("collaborators", {
      listId: args.listId,
      userDid: args.collaboratorDid,
      role,
      joinedAt,
      invitedByDid: args.invitedByDid ?? list.ownerDid,
    });
  },
});

/**
 * Add a custom grocery aisle to a list.
 */
export const addCustomAisle = mutation({
  args: {
    listId: v.id("lists"),
    name: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    const existing = list.customAisles ?? [];
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // Custom aisles start at order 50 and increment
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(a => a.order)) : 49;

    await ctx.db.patch(args.listId, {
      customAisles: [...existing, { id, name: args.name, emoji: args.emoji, order: maxOrder + 1 }],
    });

    return id;
  },
});

/**
 * Remove a custom grocery aisle from a list.
 */
export const removeCustomAisle = mutation({
  args: {
    listId: v.id("lists"),
    aisleId: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    const existing = list.customAisles ?? [];
    await ctx.db.patch(args.listId, {
      customAisles: existing.filter(a => a.id !== args.aisleId),
    });
  },
});

