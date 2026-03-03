import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { dedupeActivePresenceSessions } from "./lib/presenceSessions";
import { emitServerMetric } from "./lib/observability";

const PRESENCE_TTL_MS = 90_000;

async function requireListAccess(ctx: any, listId: Id<"lists">, userDid: string) {
  const list = await ctx.db.get(listId);
  if (!list) throw new Error("List not found");

  if (list.ownerDid === userDid) return list;

  const publication = await ctx.db
    .query("publications")
    .withIndex("by_list", (q: any) => q.eq("listId", listId))
    .first();

  if (publication?.status === "active") return list;

  throw new Error("Not authorized for this list");
}

async function emitActivePresenceSessionsGauge(ctx: any, listId: Id<"lists">, now: number) {
  const sessions = await ctx.db
    .query("presenceSessions")
    .withIndex("by_list", (q: any) => q.eq("listId", listId))
    .collect();

  const activeCount = sessions.filter((session: any) => session.expiresAt > now).length;
  emitServerMetric("active_presence_sessions", "gauge", activeCount);
}

export const setItemAssignee = mutation({
  args: {
    itemId: v.id("items"),
    actorDid: v.string(),
    assigneeDid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    await requireListAccess(ctx, item.listId, args.actorDid);

    await ctx.db.patch(args.itemId, {
      assigneeDid: args.assigneeDid,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityEvents", {
      listId: item.listId,
      itemId: args.itemId,
      eventType: "assigned",
      actorDid: args.actorDid,
      assigneeDid: args.assigneeDid,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

export const recordPresenceHeartbeat = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireListAccess(ctx, args.listId, args.userDid);

    const now = Date.now();
    const expiresAt = now + PRESENCE_TTL_MS;

    const expired = await ctx.db
      .query("presenceSessions")
      .withIndex("by_list_expires", (q) => q.eq("listId", args.listId).lt("expiresAt", now))
      .collect();

    for (const session of expired) {
      await ctx.db.delete(session._id);
    }

    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      if (existing.listId !== args.listId || existing.userDid !== args.userDid) {
        throw new Error("Session conflict");
      }
      await ctx.db.patch(existing._id, { lastSeenAt: now, expiresAt });
    } else {
      await ctx.db.insert("presenceSessions", {
        listId: args.listId,
        userDid: args.userDid,
        sessionId: args.sessionId,
        lastSeenAt: now,
        expiresAt,
      });
    }

    await emitActivePresenceSessionsGauge(ctx, args.listId, now);

    return { ok: true, expiresAt };
  },
});

export const clearPresenceSession = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireListAccess(ctx, args.listId, args.userDid);

    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!existing) {
      return { ok: true };
    }

    if (existing.listId !== args.listId || existing.userDid !== args.userDid) {
      throw new Error("Not authorized to clear this session");
    }

    await ctx.db.delete(existing._id);

    await emitActivePresenceSessionsGauge(ctx, args.listId, Date.now());

    return { ok: true };
  },
});

export const getActivePresence = query({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireListAccess(ctx, args.listId, args.userDid);

    const now = args.now ?? Date.now();

    const sessions = await ctx.db
      .query("presenceSessions")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    return dedupeActivePresenceSessions(sessions, now);
  },
});

export const getActivityFeed = query({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireListAccess(ctx, args.listId, args.userDid);

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const rows = await ctx.db
      .query("activityEvents")
      .withIndex("by_list_created", (q) => q.eq("listId", args.listId))
      .order("desc")
      .take(limit);

    return rows;
  },
});
