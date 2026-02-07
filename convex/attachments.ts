/**
 * File attachments for list items.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Helper to check if a user can edit a list.
 */
async function canUserEditList(
  ctx: MutationCtx | QueryCtx,
  listId: Id<"lists">,
  userDid: string,
  legacyDid?: string
): Promise<boolean> {
  const didsToCheck = [userDid];
  if (legacyDid) didsToCheck.push(legacyDid);

  for (const did of didsToCheck) {
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_list_user", (q) =>
        q.eq("listId", listId).eq("userDid", did)
      )
      .first();

    if (collab && (collab.role === "owner" || collab.role === "editor")) {
      return true;
    }
  }

  const list = await ctx.db.get(listId);
  if (!list) return false;

  for (const did of didsToCheck) {
    if (list.ownerDid === did) return true;
  }

  return false;
}

/**
 * Generate an upload URL for a file attachment.
 */
export const generateUploadUrl = mutation({
  args: {
    itemId: v.id("items"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const canEdit = await canUserEditList(ctx, item.listId, args.userDid, args.legacyDid);
    if (!canEdit) {
      throw new Error("Not authorized to add attachments to this item");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Add an attachment to an item after upload.
 */
export const addAttachment = mutation({
  args: {
    itemId: v.id("items"),
    storageId: v.id("_storage"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const canEdit = await canUserEditList(ctx, item.listId, args.userDid, args.legacyDid);
    if (!canEdit) {
      throw new Error("Not authorized to add attachments to this item");
    }

    const currentAttachments = item.attachments ?? [];
    await ctx.db.patch(args.itemId, {
      attachments: [...currentAttachments, args.storageId],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove an attachment from an item.
 */
export const removeAttachment = mutation({
  args: {
    itemId: v.id("items"),
    storageId: v.id("_storage"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const canEdit = await canUserEditList(ctx, item.listId, args.userDid, args.legacyDid);
    if (!canEdit) {
      throw new Error("Not authorized to remove attachments from this item");
    }

    const currentAttachments = item.attachments ?? [];
    await ctx.db.patch(args.itemId, {
      attachments: currentAttachments.filter((id) => id !== args.storageId),
      updatedAt: Date.now(),
    });

    // Delete the file from storage
    await ctx.storage.delete(args.storageId);
  },
});

/**
 * Get attachment URLs for an item.
 */
export const getAttachmentUrls = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !item.attachments) return [];

    const urls: { storageId: Id<"_storage">; url: string | null }[] = [];
    for (const storageId of item.attachments) {
      const url = await ctx.storage.getUrl(storageId);
      urls.push({ storageId, url });
    }
    return urls;
  },
});
