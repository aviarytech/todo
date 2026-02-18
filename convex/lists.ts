import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Creates a placeholder Verifiable Credential for list ownership.
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

  return {
    type: "ListOwnershipCredential",
    issuer: ownerDid,
    issuanceDate: createdAt,
    credentialSubject: {
      id: assetDid,
      ownerDid,
    },
    proof: JSON.stringify(fullVc),
  };
}

/**
 * Create a new list.
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
    const listId = await ctx.db.insert("lists", {
      assetDid: args.assetDid,
      name: args.name,
      ownerDid: args.ownerDid,
      categoryId: args.categoryId,
      createdAt: args.createdAt,
    });

    const vcProof = createListOwnershipVC(
      listId,
      args.assetDid,
      args.ownerDid,
      args.name,
      args.createdAt
    );

    await ctx.db.patch(listId, { vcProof });

    return listId;
  },
});

/**
 * Rename a list. Only the owner can rename.
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
    if (!list) throw new Error("List not found");

    const dids = [args.userDid];
    if (args.legacyDid) dids.push(args.legacyDid);

    if (!dids.includes(list.ownerDid)) {
      throw new Error("Only the list owner can rename this list");
    }

    const vcProof = createListOwnershipVC(
      args.listId,
      list.assetDid ?? "",
      list.ownerDid,
      args.name,
      list.createdAt
    );

    await ctx.db.patch(args.listId, { name: args.name, vcProof });
  },
});

/**
 * Update the category of a list. Only owner can change.
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
    if (!list) throw new Error("List not found");

    const dids = [args.userDid];
    if (args.legacyDid) dids.push(args.legacyDid);

    if (!dids.includes(list.ownerDid)) {
      throw new Error("Only the list owner can change the category");
    }

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category) throw new Error("Category not found");
    }

    await ctx.db.patch(args.listId, { categoryId: args.categoryId });
  },
});

/**
 * Get a list by its ID.
 */
export const getList = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.listId);
  },
});

/**
 * Get all lists where user is the owner, plus any bookmarked published lists.
 */
export const getUserLists = query({
  args: {
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
    walletDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const didsToCheck = [args.userDid];
    if (args.legacyDid) didsToCheck.push(args.legacyDid);
    if (args.walletDid) didsToCheck.push(args.walletDid);

    const listMap = new Map<string, Doc<"lists">>();

    // Get lists where user is owner
    for (const did of didsToCheck) {
      const ownedLists = await ctx.db
        .query("lists")
        .withIndex("by_owner", (q) => q.eq("ownerDid", did))
        .collect();

      for (const list of ownedLists) {
        if (!listMap.has(list._id.toString())) {
          listMap.set(list._id.toString(), list);
        }
      }
    }

    // Get bookmarked lists
    for (const did of didsToCheck) {
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userDid", did))
        .collect();

      for (const bookmark of bookmarks) {
        if (!listMap.has(bookmark.listId.toString())) {
          const list = await ctx.db.get(bookmark.listId);
          if (list) {
            listMap.set(bookmark.listId.toString(), list);
          }
        }
      }
    }

    return Array.from(listMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

/**
 * Delete a list and all its items.
 * Only the owner can delete a list.
 */
export const deleteList = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    const dids = [args.userDid];
    if (args.legacyDid) dids.push(args.legacyDid);

    if (!dids.includes(list.ownerDid)) {
      throw new Error("Only the list owner can delete this list");
    }

    // Delete all items
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete publications
    const pubs = await ctx.db
      .query("publications")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const pub of pubs) {
      await ctx.db.delete(pub._id);
    }

    // Delete bookmarks referencing this list
    const bookmarks = await ctx.db.query("bookmarks").collect();
    for (const bm of bookmarks) {
      if (bm.listId === args.listId) {
        await ctx.db.delete(bm._id);
      }
    }

    await ctx.db.delete(args.listId);
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
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(a => a.order)) : 49;

    await ctx.db.patch(args.listId, {
      customAisles: [...existing, { id, name: args.name, emoji: args.emoji, order: maxOrder + 1 }],
    });

    return id;
  },
});

/**
 * Update the item view mode for a list.
 */
export const updateItemViewMode = mutation({
  args: {
    listId: v.id("lists"),
    itemViewMode: v.union(v.literal("alphabetical"), v.literal("categorized")),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    await ctx.db.patch(args.listId, { itemViewMode: args.itemViewMode });
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
