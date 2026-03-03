import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canUserEditList } from "./lib/permissions";

const PRESENCE_EXPIRY_MS = 90_000;

async function cleanupExpiredPresenceForList(ctx: { db: any }, listId: unknown, now: number) {
  const rows = await ctx.db
    .query("presence")
    .withIndex("by_list", (q) => q.eq("listId", listId as any))
    .collect();

  for (const row of rows) {
    const expiresAt = row.expiresAt ?? (row.lastSeenAt + PRESENCE_EXPIRY_MS);
    if (expiresAt <= now) {
      await ctx.db.delete(row._id);
    }
  }
}

export const heartbeat = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("idle"), v.literal("offline"))),
  },
  handler: async (ctx, args) => {
    const canAccess = await canUserEditList(ctx, args.listId, args.userDid, args.legacyDid);
    if (!canAccess) throw new Error("Not authorized to update presence");

    const now = Date.now();
    const status = args.status ?? "active";
    const expiresAt = now + PRESENCE_EXPIRY_MS;

    await cleanupExpiredPresenceForList(ctx, args.listId, now);

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_list_user", (q) => q.eq("listId", args.listId).eq("userDid", args.userDid))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status, lastSeenAt: now, expiresAt, updatedAt: now });
    } else {
      await ctx.db.insert("presence", {
        listId: args.listId,
        userDid: args.userDid,
        status,
        lastSeenAt: now,
        expiresAt,
        updatedAt: now,
      });
    }

    await ctx.db.insert("activities", {
      listId: args.listId,
      actorDid: args.userDid,
      type: "presence_heartbeat",
      metadata: { status },
      createdAt: now,
    });

    return { success: true, status, lastSeenAt: now, expiresAt };
  },
});

export const markOffline = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    legacyDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const canAccess = await canUserEditList(ctx, args.listId, args.userDid, args.legacyDid);
    if (!canAccess) throw new Error("Not authorized to update presence");

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_list_user", (q) => q.eq("listId", args.listId).eq("userDid", args.userDid))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "offline",
        updatedAt: now,
        lastSeenAt: now,
        expiresAt: now + PRESENCE_EXPIRY_MS,
      });
    }

    await cleanupExpiredPresenceForList(ctx, args.listId, now);

    await ctx.db.insert("activities", {
      listId: args.listId,
      actorDid: args.userDid,
      type: "presence_offline",
      metadata: { status: "offline" },
      createdAt: now,
    });

    return { success: true };
  },
});

export const getListPresence = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    return rows
      .filter((row) => (row.expiresAt ?? (row.lastSeenAt + PRESENCE_EXPIRY_MS)) > now)
      .map((row) => {
        const computedStatus = row.status === "offline" ? "offline" : "active";
        const expiresAt = row.expiresAt ?? (row.lastSeenAt + PRESENCE_EXPIRY_MS);
        return { ...row, expiresAt, computedStatus };
      });
  },
});
