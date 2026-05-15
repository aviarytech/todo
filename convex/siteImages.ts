import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  bucketKey as makeBucketKey,
  deleteObject,
  presignPut,
} from "./lib/bucket";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/avif",
]);

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/[^A-Za-z0-9._\-]/g, "_")
    .replace(/^\.+/, "");
  if (!cleaned) throw new Error("Filename is empty.");
  if (cleaned.length > 128) throw new Error("Filename is too long.");
  return cleaned;
}

function imageKindOrAsset(value: string | undefined) {
  if (value === "favicon" || value === "og" || value === "avatar" || value === "asset") {
    return value;
  }
  return "asset" as const;
}

export const generateSiteImageUploadUrl = action({
  args: {
    ownerDid: v.string(),
    siteId: v.id("sites"),
    fileName: v.string(),
    contentType: v.string(),
    byteLength: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ uploadUrl: string; bucketKey: string; fileName: string }> => {
    if (!ALLOWED_TYPES.has(args.contentType)) {
      throw new Error(`Unsupported image type: ${args.contentType}`);
    }
    if (args.byteLength <= 0 || args.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image is empty or exceeds the 10 MB limit.");
    }

    const owned = await ctx.runQuery(internal.siteImages.assertOwnsSite, {
      siteId: args.siteId,
      ownerDid: args.ownerDid,
    });
    if (!owned) throw new Error("Site not found");

    const fileName = sanitizeFileName(args.fileName);
    const key = makeBucketKey("site-images", args.siteId, fileName);
    const uploadUrl = await presignPut(key, {
      contentType: args.contentType,
      expiresSec: 600,
    });
    return { uploadUrl, bucketKey: key, fileName };
  },
});

export const addSiteImage = mutation({
  args: {
    ownerDid: v.string(),
    siteId: v.id("sites"),
    fileName: v.string(),
    bucketKey: v.string(),
    contentType: v.string(),
    byteLength: v.number(),
    sha256: v.string(),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ imageId: Id<"siteImages"> }> => {
    const site = await ctx.db.get(args.siteId);
    if (!site || site.ownerDid !== args.ownerDid) {
      throw new Error("Site not found");
    }

    const fileName = sanitizeFileName(args.fileName);
    const now = Date.now();
    const existing = await ctx.db
      .query("siteImages")
      .withIndex("by_site_filename", (q) =>
        q.eq("siteId", args.siteId).eq("fileName", fileName)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        bucketKey: args.bucketKey,
        contentType: args.contentType,
        byteLength: args.byteLength,
        sha256: args.sha256,
        kind: imageKindOrAsset(args.kind),
        updatedAt: now,
      });
      return { imageId: existing._id };
    }

    const imageId = await ctx.db.insert("siteImages", {
      siteId: args.siteId,
      fileName,
      bucketKey: args.bucketKey,
      contentType: args.contentType,
      byteLength: args.byteLength,
      sha256: args.sha256,
      kind: imageKindOrAsset(args.kind),
      createdAt: now,
    });
    return { imageId };
  },
});

export const listSiteImages = query({
  args: { ownerDid: v.string(), siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site || site.ownerDid !== args.ownerDid) return [];

    return await ctx.db
      .query("siteImages")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .collect();
  },
});

export const removeSiteImage = action({
  args: {
    ownerDid: v.string(),
    imageId: v.id("siteImages"),
  },
  handler: async (ctx, args): Promise<void> => {
    const image = await ctx.runQuery(internal.siteImages.getOwnedImage, {
      imageId: args.imageId,
      ownerDid: args.ownerDid,
    });
    if (!image) throw new Error("Image not found");

    await deleteObject(image.bucketKey);
    await ctx.runMutation(internal.siteImages.deleteImageRow, {
      imageId: args.imageId,
    });
  },
});

export const assertOwnsSite = internalQuery({
  args: { siteId: v.id("sites"), ownerDid: v.string() },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site || site.ownerDid !== args.ownerDid) return null;
    return { siteId: site._id };
  },
});

export const getOwnedImage = internalQuery({
  args: { imageId: v.id("siteImages"), ownerDid: v.string() },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return null;
    const site = await ctx.db.get(image.siteId);
    if (!site || site.ownerDid !== args.ownerDid) return null;
    return image;
  },
});

export const deleteImageRow = internalMutation({
  args: { imageId: v.id("siteImages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.imageId);
  },
});

export const resolvePublicImage = internalQuery({
  args: { siteId: v.id("sites"), fileName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("siteImages")
      .withIndex("by_site_filename", (q) =>
        q.eq("siteId", args.siteId).eq("fileName", args.fileName)
      )
      .first();
  },
});
