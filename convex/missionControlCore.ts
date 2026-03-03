import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function hasListAccess(ctx: any, listId: Id<"lists">, userDid: string) {
  const list = await ctx.db.get(listId);
  if (!list) return false;
  if (list.ownerDid === userDid) return true;

  const pub = await ctx.db
    .query("publications")
    .withIndex("by_list", (q: any) => q.eq("listId", listId))
    .first();

  return pub?.status === "active";
}

export const upsertAgentProfile = mutation({
  args: {
    ownerDid: v.string(),
    agentSlug: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner_slug", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        description: args.description,
        capabilities: args.capabilities,
        metadata: args.metadata,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("agentProfiles", {
      ownerDid: args.ownerDid,
      agentSlug: args.agentSlug,
      displayName: args.displayName,
      description: args.description,
      capabilities: args.capabilities,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getAgentProfile = query({
  args: { ownerDid: v.string(), agentSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner_slug", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug))
      .first();
  },
});

export const listAgentProfiles = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("agentProfiles").withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid)).collect();
  },
});

export const createApiKeyRecord = mutation({
  args: {
    ownerDid: v.string(),
    label: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
    agentProfileId: v.optional(v.id("agentProfiles")),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("apiKeys", {
      ownerDid: args.ownerDid,
      label: args.label,
      keyPrefix: args.keyPrefix,
      keyHash: args.keyHash,
      scopes: args.scopes,
      agentProfileId: args.agentProfileId,
      createdAt: now,
      lastUsedAt: undefined,
      revokedAt: undefined,
      expiresAt: args.expiresAt,
    });
  },
});

export const listApiKeys = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("apiKeys").withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid)).collect();
  },
});

export const getApiKeyByHash = query({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("apiKeys").withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash)).first();
  },
});

export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys"), ownerDid: v.string() },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key || key.ownerDid !== args.ownerDid) throw new Error("API key not found");
    await ctx.db.patch(args.keyId, { revokedAt: Date.now() });
    return { ok: true };
  },
});

export const touchApiKeyUsage = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
    return { ok: true };
  },
});

export const createRotatedApiKey = mutation({
  args: {
    ownerDid: v.string(),
    rotatedByDid: v.string(),
    oldKeyId: v.id("apiKeys"),
    label: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
    agentProfileId: v.optional(v.id("agentProfiles")),
    expiresAt: v.optional(v.number()),
    graceEndsAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oldKey = await ctx.db.get(args.oldKeyId);
    if (!oldKey || oldKey.ownerDid !== args.ownerDid) throw new Error("API key not found");
    if (oldKey.revokedAt) throw new Error("Cannot rotate revoked API key");

    const newKeyId = await ctx.db.insert("apiKeys", {
      ownerDid: args.ownerDid,
      label: args.label,
      keyPrefix: args.keyPrefix,
      keyHash: args.keyHash,
      scopes: args.scopes,
      agentProfileId: args.agentProfileId,
      rotatedFromKeyId: oldKey._id,
      createdAt: now,
      expiresAt: args.expiresAt,
    });

    await ctx.db.patch(oldKey._id, {
      rotatedToKeyId: newKeyId,
      rotationGraceEndsAt: args.graceEndsAt,
    });

    const rotationEventId = await ctx.db.insert("apiKeyRotationEvents", {
      ownerDid: args.ownerDid,
      oldKeyId: oldKey._id,
      newKeyId,
      rotatedByDid: args.rotatedByDid,
      graceEndsAt: args.graceEndsAt,
      createdAt: now,
      updatedAt: now,
    });

    return { newKeyId, rotationEventId };
  },
});

export const finalizeApiKeyRotation = mutation({
  args: { ownerDid: v.string(), oldKeyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const oldKey = await ctx.db.get(args.oldKeyId);
    if (!oldKey || oldKey.ownerDid !== args.ownerDid) throw new Error("API key not found");
    if (!oldKey.rotatedToKeyId) throw new Error("API key is not in rotation");

    const now = Date.now();
    await ctx.db.patch(oldKey._id, { revokedAt: now });

    const event = await ctx.db
      .query("apiKeyRotationEvents")
      .withIndex("by_old_key", (q) => q.eq("oldKeyId", oldKey._id))
      .first();

    if (event) {
      await ctx.db.patch(event._id, { oldKeyRevokedAt: now, updatedAt: now });
    }

    return { ok: true, revokedAt: now };
  },
});

export const listApiKeyRotationEvents = query({
  args: { ownerDid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    return await ctx.db
      .query("apiKeyRotationEvents")
      .withIndex("by_owner_created", (q) => q.eq("ownerDid", args.ownerDid))
      .order("desc")
      .take(limit);
  },
});

const DEFAULT_ARTIFACT_RETENTION_DAYS = 30;
const SYSTEM_RETENTION_ACTOR_DID = "system:artifact-retention-job";

export const getMissionControlSettings = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("missionControlSettings")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .first();

    return settings ?? { artifactRetentionDays: DEFAULT_ARTIFACT_RETENTION_DAYS };
  },
});

export const upsertMissionControlSettings = mutation({
  args: { ownerDid: v.string(), updatedByDid: v.string(), artifactRetentionDays: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const artifactRetentionDays = Math.min(Math.max(Math.floor(args.artifactRetentionDays), 1), 365);
    const existing = await ctx.db
      .query("missionControlSettings")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { artifactRetentionDays, updatedByDid: args.updatedByDid, updatedAt: now });
      return { ok: true, artifactRetentionDays };
    }

    await ctx.db.insert("missionControlSettings", {
      ownerDid: args.ownerDid,
      artifactRetentionDays,
      updatedByDid: args.updatedByDid,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, artifactRetentionDays };
  },
});

export const applyArtifactRetention = mutation({
  args: {
    ownerDid: v.string(),
    actorDid: v.string(),
    retentionDays: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
    maxRuns: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("missionControlSettings")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .first();

    const retentionDays = Math.min(Math.max(Math.floor(args.retentionDays ?? settings?.artifactRetentionDays ?? DEFAULT_ARTIFACT_RETENTION_DAYS), 1), 365);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const dryRun = args.dryRun ?? true;
    const maxRuns = Math.min(Math.max(args.maxRuns ?? 250, 1), 1000);

    const runs = await ctx.db
      .query("missionRuns")
      .withIndex("by_owner_created", (q) => q.eq("ownerDid", args.ownerDid))
      .order("desc")
      .take(maxRuns);

    let runsTouched = 0;
    let deletedArtifacts = 0;
    const now = Date.now();

    for (const run of runs) {
      const artifacts = run.artifactRefs ?? [];
      const staleArtifacts = artifacts.filter((a) => a.createdAt < cutoff);
      if (!staleArtifacts.length) continue;

      runsTouched += 1;
      deletedArtifacts += staleArtifacts.length;

      await ctx.db.insert("missionArtifactDeletionLogs", {
        ownerDid: args.ownerDid,
        runId: run._id,
        deletedCount: staleArtifacts.length,
        dryRun,
        retentionCutoffAt: cutoff,
        actorDid: args.actorDid,
        trigger: "operator",
        deletedArtifacts: staleArtifacts,
        createdAt: now,
      });

      if (!dryRun) {
        await ctx.db.patch(run._id, {
          artifactRefs: artifacts.filter((a) => a.createdAt >= cutoff),
          updatedAt: now,
        });
      }
    }

    return { ok: true, dryRun, retentionDays, retentionCutoffAt: cutoff, runsScanned: runs.length, runsTouched, deletedArtifacts };
  },
});

export const listArtifactDeletionLogs = query({
  args: { ownerDid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    return await ctx.db
      .query("missionArtifactDeletionLogs")
      .withIndex("by_owner_created", (q) => q.eq("ownerDid", args.ownerDid))
      .order("desc")
      .take(limit);
  },
});

export const runArtifactRetentionSweep = internalMutation({
  args: {
    ownerDid: v.optional(v.string()),
    retentionDays: v.optional(v.number()),
    maxRunsPerOwner: v.optional(v.number()),
    maxOwners: v.optional(v.number()),
    schedulerJobId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const maxRunsPerOwner = Math.min(Math.max(args.maxRunsPerOwner ?? 250, 1), 1000);
    const maxOwners = Math.min(Math.max(args.maxOwners ?? 250, 1), 1000);

    const ownerDidList = args.ownerDid
      ? [args.ownerDid]
      : (await ctx.db.query("users").take(maxOwners))
          .map((user) => user.did)
          .filter((did): did is string => Boolean(did));

    let totalRunsScanned = 0;
    let totalRunsTouched = 0;
    let totalDeletedArtifacts = 0;

    for (const ownerDid of ownerDidList) {
      const settings = await ctx.db
        .query("missionControlSettings")
        .withIndex("by_owner", (q) => q.eq("ownerDid", ownerDid))
        .first();

      const retentionDays = Math.min(
        Math.max(Math.floor(args.retentionDays ?? settings?.artifactRetentionDays ?? DEFAULT_ARTIFACT_RETENTION_DAYS), 1),
        365,
      );
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

      const runs = await ctx.db
        .query("missionRuns")
        .withIndex("by_owner_created", (q) => q.eq("ownerDid", ownerDid))
        .order("desc")
        .take(maxRunsPerOwner);

      totalRunsScanned += runs.length;
      const now = Date.now();

      for (const run of runs) {
        const artifacts = run.artifactRefs ?? [];
        const staleArtifacts = artifacts.filter((a) => a.createdAt < cutoff);
        if (!staleArtifacts.length) continue;

        totalRunsTouched += 1;
        totalDeletedArtifacts += staleArtifacts.length;

        await ctx.db.insert("missionArtifactDeletionLogs", {
          ownerDid,
          runId: run._id,
          deletedCount: staleArtifacts.length,
          dryRun: false,
          retentionCutoffAt: cutoff,
          actorDid: SYSTEM_RETENTION_ACTOR_DID,
          trigger: "system",
          schedulerJobId: args.schedulerJobId,
          deletedArtifacts: staleArtifacts,
          createdAt: now,
        });

        await ctx.db.patch(run._id, {
          artifactRefs: artifacts.filter((a) => a.createdAt >= cutoff),
          updatedAt: now,
        });
      }
    }

    return {
      ok: true,
      ownerCount: ownerDidList.length,
      totalRunsScanned,
      totalRunsTouched,
      totalDeletedArtifacts,
      schedulerJobId: args.schedulerJobId,
    };
  },
});

export const listTasksForList = query({
  args: { listId: v.id("lists"), userDid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const ok = await hasListAccess(ctx, args.listId, args.userDid);
    if (!ok) throw new Error("Not authorized");

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
    return await ctx.db.query("items").withIndex("by_list", (q) => q.eq("listId", args.listId)).take(limit);
  },
});

export const getTaskById = query({
  args: { itemId: v.id("items"), userDid: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    const ok = await hasListAccess(ctx, item.listId, args.userDid);
    if (!ok) throw new Error("Not authorized");
    return item;
  },
});

export const addAgentMemory = mutation({
  args: {
    ownerDid: v.string(),
    listId: v.optional(v.id("lists")),
    agentSlug: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.listId) {
      const ok = await hasListAccess(ctx, args.listId, args.ownerDid);
      if (!ok) throw new Error("Not authorized");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("agentMemory")
      .withIndex("by_owner_agent_key", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug).eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, listId: args.listId, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("agentMemory", {
      ownerDid: args.ownerDid,
      listId: args.listId,
      agentSlug: args.agentSlug,
      key: args.key,
      value: args.value,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getAgentMemory = query({
  args: { ownerDid: v.string(), agentSlug: v.string(), key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.key) {
      return await ctx.db
        .query("agentMemory")
        .withIndex("by_owner_agent_key", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug).eq("key", args.key!))
        .first();
    }

    return await ctx.db
      .query("agentMemory")
      .withIndex("by_owner_agent", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug))
      .collect();
  },
});

export const listActivityEvents = query({
  args: { listId: v.id("lists"), userDid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const ok = await hasListAccess(ctx, args.listId, args.userDid);
    if (!ok) throw new Error("Not authorized");

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
    return await ctx.db
      .query("activityEvents")
      .withIndex("by_list_created", (q) => q.eq("listId", args.listId))
      .order("desc")
      .take(limit);
  },
});

type TerminalReason = "completed" | "killed" | "timeout" | "error" | "escalated";
type RunStatus = "starting" | "running" | "degraded" | "blocked" | "failed" | "finished";

const HEARTBEAT_INTERVAL_DEFAULT_MS = 30_000;
const HEARTBEAT_DEGRADED_DEFAULT_MISSES = 2;
const HEARTBEAT_FAILED_DEFAULT_MISSES = 5;
const MAX_AUTO_RETRIES = 2;

function isTerminal(status: RunStatus) {
  return status === "failed" || status === "finished" || status === "blocked";
}

export const createMissionRun = mutation({
  args: {
    ownerDid: v.string(),
    listId: v.id("lists"),
    itemId: v.optional(v.id("items")),
    agentSlug: v.string(),
    provider: v.optional(v.string()),
    computerId: v.optional(v.string()),
    parentRunId: v.optional(v.id("missionRuns")),
    heartbeatIntervalMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ok = await hasListAccess(ctx, args.listId, args.ownerDid);
    if (!ok) throw new Error("Not authorized");

    const now = Date.now();
    let attempt = 1;

    if (args.parentRunId) {
      const parent = await ctx.db.get(args.parentRunId);
      if (!parent || parent.ownerDid !== args.ownerDid) throw new Error("parentRunId not found");
      attempt = (parent.attempt ?? 1) + 1;
    }

    const runId = await ctx.db.insert("missionRuns", {
      ownerDid: args.ownerDid,
      listId: args.listId,
      itemId: args.itemId,
      agentSlug: args.agentSlug,
      provider: args.provider,
      computerId: args.computerId,
      status: "starting",
      startedAt: now,
      endedAt: undefined,
      attempt,
      parentRunId: args.parentRunId,
      durationMs: undefined,
      terminalReason: undefined,
      heartbeatIntervalMs: args.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_DEFAULT_MS,
      heartbeatMisses: 0,
      heartbeatDegradedThreshold: HEARTBEAT_DEGRADED_DEFAULT_MISSES,
      heartbeatFailedThreshold: HEARTBEAT_FAILED_DEFAULT_MISSES,
      lastHeartbeatAt: now,
      transientFailureCount: 0,
      escalationAt: undefined,
      artifactRefs: [],
      createdAt: now,
      updatedAt: now,
    });

    return { runId, attempt };
  },
});

export const updateMissionRun = mutation({
  args: {
    runId: v.id("missionRuns"),
    ownerDid: v.string(),
    provider: v.optional(v.string()),
    computerId: v.optional(v.string()),
    costEstimate: v.optional(v.number()),
    tokenUsage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerDid !== args.ownerDid) throw new Error("Run not found");

    await ctx.db.patch(args.runId, {
      provider: args.provider ?? run.provider,
      computerId: args.computerId ?? run.computerId,
      costEstimate: args.costEstimate ?? run.costEstimate,
      tokenUsage: args.tokenUsage ?? run.tokenUsage,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const deleteMissionRun = mutation({
  args: {
    runId: v.id("missionRuns"),
    ownerDid: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerDid !== args.ownerDid) throw new Error("Run not found");
    await ctx.db.delete(args.runId);
    return { ok: true };
  },
});

export const transitionMissionRun = mutation({
  args: {
    runId: v.id("missionRuns"),
    ownerDid: v.string(),
    nextStatus: v.union(
      v.literal("starting"),
      v.literal("running"),
      v.literal("degraded"),
      v.literal("blocked"),
      v.literal("failed"),
      v.literal("finished")
    ),
    terminalReason: v.optional(v.union(
      v.literal("completed"),
      v.literal("killed"),
      v.literal("timeout"),
      v.literal("error"),
      v.literal("escalated")
    )),
    costEstimate: v.optional(v.number()),
    tokenUsage: v.optional(v.number()),
    escalationAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerDid !== args.ownerDid) throw new Error("Run not found");

    if (isTerminal(run.status as RunStatus)) {
      throw new Error("Run is already terminal");
    }

    const allowedTransitions: Record<RunStatus, RunStatus[]> = {
      starting: ["running", "failed", "blocked"],
      running: ["degraded", "blocked", "failed", "finished"],
      degraded: ["running", "blocked", "failed", "finished"],
      blocked: [],
      failed: [],
      finished: [],
    };

    if (!allowedTransitions[run.status as RunStatus].includes(args.nextStatus as RunStatus)) {
      throw new Error(`Invalid state transition: ${run.status} -> ${args.nextStatus}`);
    }

    const now = Date.now();
    const terminal = isTerminal(args.nextStatus as RunStatus);
    const terminalReason = terminal ? (args.terminalReason ?? (args.nextStatus === "finished" ? "completed" : "error")) : undefined;

    await ctx.db.patch(args.runId, {
      status: args.nextStatus,
      terminalReason,
      endedAt: terminal ? now : undefined,
      durationMs: terminal ? Math.max(0, now - run.startedAt) : run.durationMs,
      costEstimate: args.costEstimate ?? run.costEstimate,
      tokenUsage: args.tokenUsage ?? run.tokenUsage,
      escalationAt: args.escalationAt ?? run.escalationAt,
      updatedAt: now,
    });

    return { ok: true };
  },
});

export const recordMissionRunHeartbeat = mutation({
  args: {
    runId: v.id("missionRuns"),
    ownerDid: v.string(),
    at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerDid !== args.ownerDid) throw new Error("Run not found");
    if (isTerminal(run.status as RunStatus)) return { ok: true, status: run.status };

    const now = args.at ?? Date.now();
    const misses = 0;
    const shouldReturnToRunning = run.status === "degraded" || run.status === "starting";

    await ctx.db.patch(args.runId, {
      status: shouldReturnToRunning ? "running" : run.status,
      heartbeatMisses: misses,
      lastHeartbeatAt: now,
      updatedAt: now,
    });

    return { ok: true, status: shouldReturnToRunning ? "running" : run.status };
  },
});

export const monitorMissionRunHeartbeats = mutation({
  args: {
    ownerDid: v.string(),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const runs = await ctx.db
      .query("missionRuns")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .collect();

    let degraded = 0;
    let failed = 0;

    for (const run of runs) {
      if (isTerminal(run.status as RunStatus)) continue;

      const intervalMs = run.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_DEFAULT_MS;
      const degradedThreshold = run.heartbeatDegradedThreshold ?? HEARTBEAT_DEGRADED_DEFAULT_MISSES;
      const failedThreshold = run.heartbeatFailedThreshold ?? HEARTBEAT_FAILED_DEFAULT_MISSES;
      const lastBeat = run.lastHeartbeatAt ?? run.startedAt;
      const elapsed = Math.max(0, now - lastBeat);
      const misses = Math.floor(elapsed / intervalMs);

      let nextStatus: RunStatus = run.status as RunStatus;
      let terminalReason: TerminalReason | undefined;
      let escalationAt = run.escalationAt;

      if (misses >= failedThreshold) {
        nextStatus = "failed";
        terminalReason = "timeout";
        if ((run.attempt ?? 1) > MAX_AUTO_RETRIES) {
          escalationAt = now;
        }
        failed += 1;
      } else if (misses >= degradedThreshold) {
        if (run.status !== "degraded") degraded += 1;
        nextStatus = "degraded";
      }

      if (nextStatus !== run.status || misses !== (run.heartbeatMisses ?? 0)) {
        await ctx.db.patch(run._id, {
          status: nextStatus,
          heartbeatMisses: misses,
          terminalReason,
          escalationAt,
          endedAt: nextStatus === "failed" ? now : run.endedAt,
          durationMs: nextStatus === "failed" ? Math.max(0, now - run.startedAt) : run.durationMs,
          updatedAt: now,
        });
      }
    }

    return { ok: true, degraded, failed, checkedAt: now };
  },
});

export const createRetryForMissionRun = mutation({
  args: {
    runId: v.id("missionRuns"),
    ownerDid: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerDid !== args.ownerDid) throw new Error("Run not found");

    if (run.status !== "failed") throw new Error("Retry only allowed for failed runs");
    if (run.terminalReason && run.terminalReason !== "timeout" && run.terminalReason !== "error") {
      throw new Error("Retry only allowed for transient failures");
    }

    if ((run.attempt ?? 1) > MAX_AUTO_RETRIES) {
      await ctx.db.patch(args.runId, {
        terminalReason: "escalated",
        escalationAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { escalated: true, reason: "max retries reached" };
    }

    const now = Date.now();
    const newRunId = await ctx.db.insert("missionRuns", {
      ownerDid: run.ownerDid,
      listId: run.listId,
      itemId: run.itemId,
      agentSlug: run.agentSlug,
      provider: run.provider,
      computerId: run.computerId,
      status: "starting",
      startedAt: now,
      endedAt: undefined,
      attempt: (run.attempt ?? 1) + 1,
      parentRunId: run._id,
      durationMs: undefined,
      terminalReason: undefined,
      costEstimate: undefined,
      tokenUsage: undefined,
      heartbeatIntervalMs: run.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_DEFAULT_MS,
      heartbeatMisses: 0,
      heartbeatDegradedThreshold: run.heartbeatDegradedThreshold ?? HEARTBEAT_DEGRADED_DEFAULT_MISSES,
      heartbeatFailedThreshold: run.heartbeatFailedThreshold ?? HEARTBEAT_FAILED_DEFAULT_MISSES,
      lastHeartbeatAt: now,
      transientFailureCount: (run.transientFailureCount ?? 0) + 1,
      escalationAt: undefined,
      artifactRefs: [],
      createdAt: now,
      updatedAt: now,
    });

    return { escalated: false, runId: newRunId };
  },
});

export const appendMissionRunArtifact = mutation({
  args: {
    runId: v.id("missionRuns"),
    ownerDid: v.string(),
    type: v.union(v.literal("screenshot"), v.literal("log"), v.literal("diff"), v.literal("file"), v.literal("url")),
    ref: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerDid !== args.ownerDid) throw new Error("Run not found");

    const now = Date.now();
    const artifactRefs = [...(run.artifactRefs ?? []), { type: args.type, ref: args.ref, label: args.label, createdAt: now }];
    await ctx.db.patch(args.runId, { artifactRefs, updatedAt: now });
    return { ok: true, artifactCount: artifactRefs.length };
  },
});

export const getMissionRunById = query({
  args: {
    ownerDid: v.string(),
    runId: v.id("missionRuns"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerDid !== args.ownerDid) return null;
    return run;
  },
});

export const listMissionRuns = query({
  args: {
    ownerDid: v.string(),
    listId: v.optional(v.id("lists")),
    itemId: v.optional(v.id("items")),
    status: v.optional(v.union(
      v.literal("starting"),
      v.literal("running"),
      v.literal("degraded"),
      v.literal("blocked"),
      v.literal("failed"),
      v.literal("finished")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pageSize = Math.min(Math.max(args.limit ?? 25, 1), 100);
    const page = Math.max(args.page ?? 1, 1);

    let rows;
    if (args.status) {
      rows = await ctx.db
        .query("missionRuns")
        .withIndex("by_owner_status", (q) => q.eq("ownerDid", args.ownerDid).eq("status", args.status!))
        .collect();
    } else if (args.listId) {
      rows = await ctx.db
        .query("missionRuns")
        .withIndex("by_owner_list", (q) => q.eq("ownerDid", args.ownerDid).eq("listId", args.listId!))
        .collect();
    } else if (args.itemId) {
      rows = await ctx.db
        .query("missionRuns")
        .withIndex("by_owner_item", (q) => q.eq("ownerDid", args.ownerDid).eq("itemId", args.itemId!))
        .collect();
    } else {
      rows = await ctx.db
        .query("missionRuns")
        .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
        .collect();
    }

    const start = args.startDate;
    const end = args.endDate;
    const filtered = rows
      .filter((run) => {
        if (start !== undefined && run.createdAt < start) return false;
        if (end !== undefined && run.createdAt > end) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const runs = filtered.slice(offset, offset + pageSize);

    return {
      runs,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  },
});

export const getMissionRunsDashboard = query({
  args: { ownerDid: v.string(), windowMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowMs = args.windowMs ?? 24 * 60 * 60 * 1000;
    const from = now - windowMs;

    const rows = await ctx.db
      .query("missionRuns")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .collect();

    const runs = rows.filter((r) => r.createdAt >= from);
    const terminal = runs.filter((r) => isTerminal(r.status as RunStatus));
    const succeeded = terminal.filter((r) => r.status === "finished").length;
    const failed = terminal.filter((r) => r.status === "failed").length;
    const blocked = terminal.filter((r) => r.status === "blocked").length;
    const timeout = terminal.filter((r) => r.terminalReason === "timeout").length;
    const intervention = terminal.filter((r) => r.terminalReason === "killed" || r.terminalReason === "escalated" || r.status === "blocked").length;

    const successRate = terminal.length ? succeeded / terminal.length : 0;
    const timeoutRate = terminal.length ? timeout / terminal.length : 0;
    const interventionRate = terminal.length ? intervention / terminal.length : 0;

    const activeRuns = runs.filter((r) => !isTerminal(r.status as RunStatus));
    const degradedRuns = activeRuns.filter((r) => r.status === "degraded");

    return {
      windowMs,
      totals: {
        runs: runs.length,
        terminal: terminal.length,
        active: activeRuns.length,
        succeeded,
        failed,
        blocked,
        timedOut: timeout,
      },
      rates: {
        successRate,
        timeoutRate,
        interventionRate,
      },
      activeByStatus: {
        starting: activeRuns.filter((r) => r.status === "starting").length,
        running: activeRuns.filter((r) => r.status === "running").length,
        degraded: degradedRuns.length,
      },
      degradedRuns: degradedRuns
        .sort((a, b) => (b.lastHeartbeatAt ?? 0) - (a.lastHeartbeatAt ?? 0))
        .slice(0, 20),
      updatedAt: now,
    };
  },
});


type LaunchAction = "pause" | "resume" | "kill" | "reassign" | "escalate";

export const controlAgentLaunch = mutation({
  args: {
    ownerDid: v.string(),
    actorDid: v.string(),
    agentSlug: v.string(),
    action: v.union(
      v.literal("pause"),
      v.literal("resume"),
      v.literal("kill"),
      v.literal("reassign"),
      v.literal("escalate")
    ),
    targetAgentSlug: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const profile = await ctx.db
      .query("agentProfiles")
      .withIndex("by_owner_slug", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug))
      .first();

    if (!profile) throw new Error("Agent profile not found");

    const patch: Record<string, unknown> = {
      updatedAt: now,
      lastStatusAt: now,
    };

    if (args.action === "pause") {
      patch.status = "idle";
      patch.launchState = "paused";
      patch.pausedAt = now;
    } else if (args.action === "resume") {
      patch.launchState = "running";
      patch.pausedAt = undefined;
      patch.killedAt = undefined;
      patch.escalatedAt = undefined;
      if ((profile.status ?? "idle") === "idle" && profile.currentTask) patch.status = "working";
    } else if (args.action === "kill") {
      patch.status = "error";
      patch.launchState = "killed";
      patch.killedAt = now;
      patch.archivedAt = now;
      patch.currentTask = undefined;
    } else if (args.action === "reassign") {
      patch.parentAgentSlug = args.targetAgentSlug;
      patch.launchState = "running";
      patch.archivedAt = undefined;
    } else if (args.action === "escalate") {
      patch.status = "error";
      patch.launchState = "escalated";
      patch.escalationLevel = (profile.escalationLevel ?? 0) + 1;
      patch.escalatedToAgentSlug = args.targetAgentSlug;
      patch.escalatedAt = now;
      patch.archivedAt = undefined;
    }

    await ctx.db.patch(profile._id, patch as any);

    await ctx.db.insert("agentControlEvents", {
      ownerDid: args.ownerDid,
      actorDid: args.actorDid,
      agentProfileId: profile._id,
      agentSlug: args.agentSlug,
      action: args.action,
      targetAgentSlug: args.targetAgentSlug,
      reason: args.reason,
      createdAt: now,
    });

    return { ok: true, agentId: profile._id, action: args.action as LaunchAction };
  },
});

export const listAgentControlEvents = query({
  args: {
    ownerDid: v.string(),
    agentSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    if (args.agentSlug) {
      return await ctx.db
        .query("agentControlEvents")
        .withIndex("by_owner_agent_created", (q) => q.eq("ownerDid", args.ownerDid).eq("agentSlug", args.agentSlug!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("agentControlEvents")
      .withIndex("by_owner_created", (q) => q.eq("ownerDid", args.ownerDid))
      .order("desc")
      .take(limit);
  },
});
