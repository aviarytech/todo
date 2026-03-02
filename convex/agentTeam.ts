import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type AgentStatus = "idle" | "working" | "error";

export const upsertAgentStatus = mutation({
  args: {
    ownerDid: v.string(),
    agentSlug: v.string(),
    displayName: v.string(),
    status: v.union(v.literal("idle"), v.literal("working"), v.literal("error")),
    currentTask: v.optional(v.string()),
    parentAgentSlug: v.optional(v.string()),
    autoArchiveOnIdle: v.optional(v.boolean()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const shouldAutoArchive = args.autoArchiveOnIdle ?? true;

    const existing = await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner_slug", (q) =>
        q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug)
      )
      .first();

    const archivedAt =
      shouldAutoArchive && !!args.parentAgentSlug && args.status === "idle" && !args.currentTask
        ? now
        : undefined;

    const basePatch = {
      displayName: args.displayName,
      parentAgentSlug: args.parentAgentSlug,
      status: args.status,
      currentTask: args.currentTask,
      lastHeartbeatAt: now,
      lastStatusAt: now,
      metadata: args.metadata,
      updatedAt: now,
      archivedAt,
    };

    if (existing) {
      await ctx.db.patch(existing._id, basePatch);
      return existing._id;
    }

    return await ctx.db.insert("agentProfiles", {
      ownerDid: args.ownerDid,
      agentSlug: args.agentSlug,
      displayName: args.displayName,
      status: args.status,
      currentTask: args.currentTask,
      parentAgentSlug: args.parentAgentSlug,
      lastHeartbeatAt: now,
      lastStatusAt: now,
      metadata: args.metadata,
      archivedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listTeamAgents = query({
  args: {
    ownerDid: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const includeArchived = args.includeArchived ?? false;
    const rows = await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .collect();

    const filtered = includeArchived ? rows : rows.filter((r) => !r.archivedAt);
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getTeamTree = query({
  args: {
    ownerDid: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const includeArchived = args.includeArchived ?? false;
    const rows = await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .collect();

    const agents = includeArchived ? rows : rows.filter((r) => !r.archivedAt);
    const bySlug = new Map(agents.map((a) => [a.agentSlug, a]));

    const childrenByParent = new Map<string, typeof agents>();
    const roots: typeof agents = [];

    for (const agent of agents) {
      const parent = agent.parentAgentSlug;
      if (parent && bySlug.has(parent)) {
        const children = childrenByParent.get(parent) ?? [];
        children.push(agent);
        childrenByParent.set(parent, children);
      } else {
        roots.push(agent);
      }
    }

    const toNode = (agent: (typeof agents)[number]) => ({
      ...agent,
      children: (childrenByParent.get(agent.agentSlug) ?? [])
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(toNode),
    });

    return roots.sort((a, b) => b.updatedAt - a.updatedAt).map(toNode);
  },
});

export const getTeamSummary = query({
  args: { ownerDid: v.string(), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const includeArchived = args.includeArchived ?? false;
    const rows = await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .collect();

    const active = includeArchived ? rows : rows.filter((r) => !r.archivedAt);
    const counts: Record<AgentStatus, number> = { idle: 0, working: 0, error: 0 };
    for (const row of active) {
      const status = (row.status ?? "idle") as AgentStatus;
      counts[status] += 1;
    }

    return { total: active.length, statusCounts: counts, updatedAt: Date.now() };
  },
});
