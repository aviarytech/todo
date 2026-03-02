import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

export const listForList = query({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
    monthStart: v.optional(v.number()),
    monthEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const list = await requireListAccess(ctx, args.listId, args.userDid);
    const rows = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_owner", (q) => q.eq("ownerDid", list.ownerDid))
      .collect();

    return rows.filter((entry) => {
      if (entry.listId && entry.listId !== args.listId) return false;
      const t = entry.scheduledAt ?? entry.nextRunAt;
      if (!t) return true;
      if (args.monthStart !== undefined && t < args.monthStart) return false;
      if (args.monthEnd !== undefined && t > args.monthEnd) return false;
      return true;
    });
  },
});

export const listForOwner = query({
  args: {
    ownerDid: v.string(),
    actorDid: v.string(),
    listId: v.optional(v.id("lists")),
  },
  handler: async (ctx, args) => {
    if (args.ownerDid !== args.actorDid) throw new Error("Not authorized");
    const rows = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .collect();

    return rows
      .filter((entry) => (args.listId ? entry.listId === args.listId : true))
      .sort((a, b) => {
        const at = a.nextRunAt ?? a.scheduledAt ?? a.updatedAt;
        const bt = b.nextRunAt ?? b.scheduledAt ?? b.updatedAt;
        return at - bt;
      });
  },
});

export const createScheduleEntry = mutation({
  args: {
    ownerDid: v.string(),
    actorDid: v.string(),
    listId: v.optional(v.id("lists")),
    agentDid: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    scheduleType: v.union(v.literal("cron"), v.literal("once"), v.literal("recurring")),
    cronExpr: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
    enabled: v.boolean(),
    externalId: v.optional(v.string()),
    source: v.optional(v.union(v.literal("manual"), v.literal("openclaw"), v.literal("import"))),
  },
  handler: async (ctx, args) => {
    if (args.ownerDid !== args.actorDid) throw new Error("Not authorized");
    const now = Date.now();
    return await ctx.db.insert("scheduleEntries", {
      ownerDid: args.ownerDid,
      listId: args.listId,
      agentDid: args.agentDid,
      title: args.title,
      description: args.description,
      scheduleType: args.scheduleType,
      cronExpr: args.cronExpr,
      scheduledAt: args.scheduledAt,
      nextRunAt: args.nextRunAt,
      lastRunAt: undefined,
      lastStatus: undefined,
      enabled: args.enabled,
      externalId: args.externalId,
      source: args.source ?? "manual",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateScheduleEntry = mutation({
  args: {
    entryId: v.id("scheduleEntries"),
    actorDid: v.string(),
    enabled: v.optional(v.boolean()),
    nextRunAt: v.optional(v.number()),
    lastRunAt: v.optional(v.number()),
    lastStatus: v.optional(v.union(v.literal("ok"), v.literal("error"), v.literal("skipped"))),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Schedule entry not found");
    if (entry.ownerDid !== args.actorDid) throw new Error("Not authorized");

    await ctx.db.patch(args.entryId, {
      enabled: args.enabled ?? entry.enabled,
      nextRunAt: args.nextRunAt ?? entry.nextRunAt,
      lastRunAt: args.lastRunAt ?? entry.lastRunAt,
      lastStatus: args.lastStatus ?? entry.lastStatus,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const syncCronSnapshot = mutation({
  args: {
    ownerDid: v.string(),
    actorDid: v.string(),
    agentDid: v.optional(v.string()),
    entries: v.array(v.object({
      externalId: v.string(),
      title: v.string(),
      cronExpr: v.optional(v.string()),
      nextRunAt: v.optional(v.number()),
      lastRunAt: v.optional(v.number()),
      lastStatus: v.optional(v.union(v.literal("ok"), v.literal("error"), v.literal("skipped"))),
      enabled: v.boolean(),
      listId: v.optional(v.id("lists")),
    })),
  },
  handler: async (ctx, args) => {
    if (args.ownerDid !== args.actorDid) throw new Error("Not authorized");
    const now = Date.now();
    const touched = new Set<string>();

    for (const payload of args.entries) {
      touched.add(payload.externalId);
      const existing = await ctx.db
        .query("scheduleEntries")
        .withIndex("by_owner_external", (q) => q.eq("ownerDid", args.ownerDid).eq("externalId", payload.externalId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: payload.title,
          cronExpr: payload.cronExpr,
          nextRunAt: payload.nextRunAt,
          lastRunAt: payload.lastRunAt,
          lastStatus: payload.lastStatus,
          enabled: payload.enabled,
          listId: payload.listId,
          source: "openclaw",
          agentDid: args.agentDid ?? existing.agentDid,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("scheduleEntries", {
          ownerDid: args.ownerDid,
          listId: payload.listId,
          agentDid: args.agentDid,
          title: payload.title,
          description: undefined,
          scheduleType: "cron",
          cronExpr: payload.cronExpr,
          scheduledAt: undefined,
          lastRunAt: payload.lastRunAt,
          nextRunAt: payload.nextRunAt,
          lastStatus: payload.lastStatus,
          enabled: payload.enabled,
          externalId: payload.externalId,
          source: "openclaw",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const rows = await ctx.db.query("scheduleEntries").withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid)).collect();
    for (const row of rows) {
      if (row.source !== "openclaw" || !row.externalId || touched.has(row.externalId)) continue;
      await ctx.db.patch(row._id, { enabled: false, updatedAt: now });
    }

    return { ok: true, synced: args.entries.length };
  },
});
