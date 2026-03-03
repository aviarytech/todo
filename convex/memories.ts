import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { selectMemoryChangesSince } from "./lib/memorySync";

const memorySource = v.union(v.literal("manual"), v.literal("openclaw"), v.literal("clawboot"), v.literal("import"), v.literal("api"));
const conflictPolicy = v.union(v.literal("lww"), v.literal("preserve_both"));

function normalizeTags(tags?: string[]) {
  const cleaned = tags?.map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [];
  return cleaned.length ? Array.from(new Set(cleaned)) : undefined;
}

function computeSearchText(title: string, content: string, tags?: string[]) {
  const tagText = tags?.length ? `\n${tags.join(" ")}` : "";
  return `${title}\n${content}${tagText}`;
}

export const createMemory = mutation({
  args: {
    ownerDid: v.string(),
    authorDid: v.string(),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    source: v.optional(memorySource),
    sourceRef: v.optional(v.string()),
    externalId: v.optional(v.string()),
    externalUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("title and content are required");
    const tags = normalizeTags(args.tags);
    return await ctx.db.insert("memories", {
      ownerDid: args.ownerDid,
      authorDid: args.authorDid,
      title,
      content,
      searchText: computeSearchText(title, content, tags),
      tags,
      source: args.source,
      sourceRef: args.sourceRef,
      externalId: args.externalId,
      externalUpdatedAt: args.externalUpdatedAt,
      lastSyncedAt: args.source === "openclaw" ? now : undefined,
      syncStatus: args.source === "openclaw" ? "synced" : undefined,
      conflictNote: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }
});

export const upsertOpenClawMemory = mutation({
  args: {
    ownerDid: v.string(),
    authorDid: v.string(),
    externalId: v.string(),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    sourceRef: v.optional(v.string()),
    externalUpdatedAt: v.number(),
    policy: v.optional(conflictPolicy),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("title and content are required");

    const tags = normalizeTags(args.tags);
    const policy = args.policy ?? "lww";
    const existing = await ctx.db
      .query("memories")
      .withIndex("by_owner_external", (q) => q.eq("ownerDid", args.ownerDid).eq("externalId", args.externalId))
      .first();

    if (!existing) {
      const id = await ctx.db.insert("memories", {
        ownerDid: args.ownerDid,
        authorDid: args.authorDid,
        title,
        content,
        searchText: computeSearchText(title, content, tags),
        tags,
        source: "openclaw",
        sourceRef: args.sourceRef,
        externalId: args.externalId,
        externalUpdatedAt: args.externalUpdatedAt,
        lastSyncedAt: now,
        syncStatus: "synced",
        conflictNote: undefined,
        createdAt: now,
        updatedAt: now,
      });
      return { id, status: "created" as const };
    }

    const localIsNewer = (existing.updatedAt ?? 0) > args.externalUpdatedAt;
    const contentChanged = existing.title !== title || existing.content !== content;

    if (localIsNewer && contentChanged) {
      if (policy === "preserve_both") {
        const conflictId = await ctx.db.insert("memories", {
          ownerDid: args.ownerDid,
          authorDid: args.authorDid,
          title: `${title} (remote conflicted copy)`,
          content,
          searchText: computeSearchText(`${title} (remote conflicted copy)`, content, tags),
          tags,
          source: "openclaw",
          sourceRef: args.sourceRef,
          externalId: `${args.externalId}:conflict:${now}`,
          externalUpdatedAt: args.externalUpdatedAt,
          lastSyncedAt: now,
          syncStatus: "conflict",
          conflictNote: "Remote update older than local edit; preserved as conflicted copy.",
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.patch(existing._id, {
          syncStatus: "conflict",
          conflictNote: "Remote update older than local edit; local version kept.",
          lastSyncedAt: now,
        });

        return { id: existing._id, status: "conflict_preserved" as const, conflictId };
      }

      await ctx.db.patch(existing._id, {
        syncStatus: "conflict",
        conflictNote: "Skipped stale remote update (LWW kept newer local version).",
        lastSyncedAt: now,
      });
      return { id: existing._id, status: "conflict_skipped" as const };
    }

    await ctx.db.patch(existing._id, {
      title,
      content,
      tags,
      source: "openclaw",
      sourceRef: args.sourceRef,
      externalUpdatedAt: args.externalUpdatedAt,
      searchText: computeSearchText(title, content, tags),
      syncStatus: "synced",
      conflictNote: undefined,
      lastSyncedAt: now,
      updatedAt: Math.max(now, args.externalUpdatedAt),
    });

    return { id: existing._id, status: "updated" as const };
  },
});

export const listMemories = query({
  args: {
    ownerDid: v.string(),
    query: v.optional(v.string()),
    tag: v.optional(v.string()),
    source: v.optional(memorySource),
    limit: v.optional(v.number()),
    syncStatus: v.optional(v.union(v.literal("synced"), v.literal("conflict"), v.literal("pending"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const queryText = args.query?.trim();
    let rows;
    if (queryText) {
      rows = await ctx.db.query("memories").withSearchIndex("search_content", (s) => {
        let q = s.search("searchText", queryText).eq("ownerDid", args.ownerDid);
        if (args.source) q = q.eq("source", args.source);
        return q;
      }).take(200);
    } else {
      rows = await ctx.db.query("memories").withIndex("by_owner_time", (i) => i.eq("ownerDid", args.ownerDid)).order("desc").take(200);
    }

    const tag = args.tag?.trim().toLowerCase();
    const memories = rows
      .filter((m) => (tag ? (m.tags ?? []).includes(tag) : true))
      .filter((m) => (args.syncStatus ? m.syncStatus === args.syncStatus : true))
      .filter((m) => (args.startDate !== undefined ? m.updatedAt >= args.startDate : true))
      .filter((m) => (args.endDate !== undefined ? m.updatedAt <= args.endDate : true))
      .slice(0, limit);
    const availableTags = Array.from(new Set(memories.flatMap((m) => m.tags ?? []))).sort((a, b) => a.localeCompare(b));
    const conflictCount = rows.filter((m) => m.syncStatus === "conflict").length;
    return { memories, availableTags, conflictCount };
  }
});

export const updateMemory = mutation({
  args: {
    memoryId: v.id("memories"),
    ownerDid: v.string(),
    authorDid: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.ownerDid !== args.ownerDid) throw new Error("Memory not found");

    const nextTitle = args.title !== undefined ? args.title.trim() : memory.title;
    const nextContent = args.content !== undefined ? args.content.trim() : memory.content;
    if (!nextTitle || !nextContent) throw new Error("title and content are required");

    const nextTags = args.tags !== undefined ? normalizeTags(args.tags) : memory.tags;
    const now = Date.now();

    await ctx.db.patch(args.memoryId, {
      title: nextTitle,
      content: nextContent,
      tags: nextTags,
      authorDid: args.authorDid,
      searchText: computeSearchText(nextTitle, nextContent, nextTags),
      syncStatus: "pending",
      conflictNote: undefined,
      updatedAt: now,
    });

    return { ok: true, id: args.memoryId, updatedAt: now };
  },
});

export const deleteMemory = mutation({
  args: {
    memoryId: v.id("memories"),
    ownerDid: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.ownerDid !== args.ownerDid) throw new Error("Memory not found");
    await ctx.db.delete(args.memoryId);
    return { ok: true, id: args.memoryId };
  },
});

export const listMemoryChangesSince = query({
  args: { ownerDid: v.string(), since: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 250);
    const rows = await ctx.db
      .query("memories")
      .withIndex("by_owner_time", (q) => q.eq("ownerDid", args.ownerDid))
      .order("desc")
      .take(400);

    return selectMemoryChangesSince(rows, args.since ?? 0, limit);
  },
});

// ─── Phase 3: Bidirectional Sync ─────────────────────────────────────────────

/** Batch upsert for efficient inbound sync from OpenClaw */
export const batchUpsertOpenClawMemories = mutation({
  args: {
    ownerDid: v.string(),
    authorDid: v.string(),
    memories: v.array(v.object({
      externalId: v.string(),
      title: v.string(),
      content: v.string(),
      tags: v.optional(v.array(v.string())),
      sourceRef: v.optional(v.string()),
      externalUpdatedAt: v.number(),
    })),
    policy: v.optional(conflictPolicy),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const policy = args.policy ?? "lww";
    const results: Array<{
      externalId: string;
      id: string;
      status: "created" | "updated" | "conflict_skipped" | "conflict_preserved";
      conflictId?: string;
    }> = [];

    for (const mem of args.memories) {
      const title = mem.title.trim();
      const content = mem.content.trim();
      if (!title || !content) {
        results.push({ externalId: mem.externalId, id: "", status: "conflict_skipped" });
        continue;
      }

      const tags = normalizeTags(mem.tags);
      const existing = await ctx.db
        .query("memories")
        .withIndex("by_owner_external", (q) => q.eq("ownerDid", args.ownerDid).eq("externalId", mem.externalId))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("memories", {
          ownerDid: args.ownerDid,
          authorDid: args.authorDid,
          title,
          content,
          searchText: computeSearchText(title, content, tags),
          tags,
          source: "openclaw",
          sourceRef: mem.sourceRef,
          externalId: mem.externalId,
          externalUpdatedAt: mem.externalUpdatedAt,
          lastSyncedAt: now,
          syncStatus: "synced",
          conflictNote: undefined,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ externalId: mem.externalId, id, status: "created" });
        continue;
      }

      const localIsNewer = (existing.updatedAt ?? 0) > mem.externalUpdatedAt;
      const contentChanged = existing.title !== title || existing.content !== content;

      if (localIsNewer && contentChanged) {
        if (policy === "preserve_both") {
          const conflictId = await ctx.db.insert("memories", {
            ownerDid: args.ownerDid,
            authorDid: args.authorDid,
            title: `${title} (remote conflicted copy)`,
            content,
            searchText: computeSearchText(`${title} (remote conflicted copy)`, content, tags),
            tags,
            source: "openclaw",
            sourceRef: mem.sourceRef,
            externalId: `${mem.externalId}:conflict:${now}`,
            externalUpdatedAt: mem.externalUpdatedAt,
            lastSyncedAt: now,
            syncStatus: "conflict",
            conflictNote: "Remote update older than local edit; preserved as conflicted copy.",
            createdAt: now,
            updatedAt: now,
          });

          await ctx.db.patch(existing._id, {
            syncStatus: "conflict",
            conflictNote: "Remote update older than local edit; local version kept.",
            lastSyncedAt: now,
          });

          results.push({ externalId: mem.externalId, id: existing._id, status: "conflict_preserved", conflictId });
          continue;
        }

        await ctx.db.patch(existing._id, {
          syncStatus: "conflict",
          conflictNote: "Skipped stale remote update (LWW kept newer local version).",
          lastSyncedAt: now,
        });
        results.push({ externalId: mem.externalId, id: existing._id, status: "conflict_skipped" });
        continue;
      }

      await ctx.db.patch(existing._id, {
        title,
        content,
        tags,
        source: "openclaw",
        sourceRef: mem.sourceRef,
        externalUpdatedAt: mem.externalUpdatedAt,
        searchText: computeSearchText(title, content, tags),
        syncStatus: "synced",
        conflictNote: undefined,
        lastSyncedAt: now,
        updatedAt: Math.max(now, mem.externalUpdatedAt),
      });
      results.push({ externalId: mem.externalId, id: existing._id, status: "updated" });
    }

    return {
      results,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      conflicts: results.filter((r) => r.status.startsWith("conflict")).length,
    };
  },
});

/** Resolve a conflict by picking a winner or merging */
export const resolveMemoryConflict = mutation({
  args: {
    memoryId: v.id("memories"),
    ownerDid: v.string(),
    resolution: v.union(v.literal("keep_local"), v.literal("keep_remote"), v.literal("merge")),
    mergedTitle: v.optional(v.string()),
    mergedContent: v.optional(v.string()),
    mergedTags: v.optional(v.array(v.string())),
    conflictCopyId: v.optional(v.id("memories")),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.ownerDid !== args.ownerDid) throw new Error("Memory not found");
    if (memory.syncStatus !== "conflict") throw new Error("Memory is not in conflict state");

    const now = Date.now();

    if (args.resolution === "keep_local") {
      await ctx.db.patch(args.memoryId, {
        syncStatus: "pending",
        conflictNote: undefined,
        updatedAt: now,
      });

      if (args.conflictCopyId) {
        const copy = await ctx.db.get(args.conflictCopyId);
        if (copy && copy.ownerDid === args.ownerDid && copy.syncStatus === "conflict") {
          await ctx.db.delete(args.conflictCopyId);
        }
      }

      return { ok: true, id: args.memoryId, resolution: "keep_local" as const };
    }

    if (args.resolution === "keep_remote") {
      if (args.conflictCopyId) {
        const copy = await ctx.db.get(args.conflictCopyId);
        if (copy && copy.ownerDid === args.ownerDid && copy.syncStatus === "conflict") {
          const cleanTitle = copy.title.replace(/ \(remote conflicted copy\)$/, "");
          await ctx.db.patch(args.memoryId, {
            title: cleanTitle,
            content: copy.content,
            tags: copy.tags,
            searchText: computeSearchText(cleanTitle, copy.content, copy.tags),
            syncStatus: "synced",
            conflictNote: undefined,
            externalUpdatedAt: copy.externalUpdatedAt,
            lastSyncedAt: now,
            updatedAt: now,
          });
          await ctx.db.delete(args.conflictCopyId);
          return { ok: true, id: args.memoryId, resolution: "keep_remote" as const };
        }
      }

      await ctx.db.patch(args.memoryId, {
        syncStatus: "synced",
        conflictNote: undefined,
        lastSyncedAt: now,
      });
      return { ok: true, id: args.memoryId, resolution: "keep_remote" as const };
    }

    if (args.resolution === "merge") {
      const mergedTitle = args.mergedTitle?.trim();
      const mergedContent = args.mergedContent?.trim();
      if (!mergedTitle || !mergedContent) throw new Error("Merged title and content required");

      const mergedTags = normalizeTags(args.mergedTags);
      await ctx.db.patch(args.memoryId, {
        title: mergedTitle,
        content: mergedContent,
        tags: mergedTags,
        searchText: computeSearchText(mergedTitle, mergedContent, mergedTags),
        syncStatus: "pending",
        conflictNote: undefined,
        updatedAt: now,
      });

      if (args.conflictCopyId) {
        const copy = await ctx.db.get(args.conflictCopyId);
        if (copy && copy.ownerDid === args.ownerDid) {
          await ctx.db.delete(args.conflictCopyId);
        }
      }

      return { ok: true, id: args.memoryId, resolution: "merge" as const };
    }

    throw new Error("Invalid resolution");
  },
});

/** Mark memories as synced after successful push to OpenClaw */
export const markMemoriesSynced = mutation({
  args: {
    ownerDid: v.string(),
    memoryIds: v.array(v.id("memories")),
    externalIds: v.optional(v.array(v.object({
      memoryId: v.id("memories"),
      externalId: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;

    const externalIdMap = new Map(
      (args.externalIds ?? []).map((e) => [e.memoryId, e.externalId])
    );

    for (const memoryId of args.memoryIds) {
      const memory = await ctx.db.get(memoryId);
      if (!memory || memory.ownerDid !== args.ownerDid) continue;

      const patch: {
        syncStatus: "synced";
        conflictNote: undefined;
        lastSyncedAt: number;
        externalId?: string;
      } = {
        syncStatus: "synced",
        conflictNote: undefined,
        lastSyncedAt: now,
      };

      const extId = externalIdMap.get(memoryId);
      if (extId && !memory.externalId) {
        patch.externalId = extId;
      }

      await ctx.db.patch(memoryId, patch);
      updated++;
    }

    return { ok: true, updated };
  },
});

/** List memories pending sync to OpenClaw */
export const listPendingMemoryChanges = query({
  args: {
    ownerDid: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const rows = await ctx.db
      .query("memories")
      .withIndex("by_owner_sync_status", (q) => q.eq("ownerDid", args.ownerDid).eq("syncStatus", "pending"))
      .order("asc")
      .take(limit);

    return {
      pending: rows.map((r) => ({
        id: r._id,
        externalId: r.externalId,
        title: r.title,
        content: r.content,
        tags: r.tags,
        source: r.source,
        sourceRef: r.sourceRef,
        updatedAt: r.updatedAt,
      })),
      count: rows.length,
    };
  },
});

/** List memories in conflict state */
export const listMemoryConflicts = query({
  args: {
    ownerDid: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const rows = await ctx.db
      .query("memories")
      .withIndex("by_owner_sync_status", (q) => q.eq("ownerDid", args.ownerDid).eq("syncStatus", "conflict"))
      .order("desc")
      .take(limit);

    return {
      conflicts: rows.map((r) => ({
        id: r._id,
        externalId: r.externalId,
        title: r.title,
        content: r.content,
        tags: r.tags,
        conflictNote: r.conflictNote,
        updatedAt: r.updatedAt,
        externalUpdatedAt: r.externalUpdatedAt,
      })),
      count: rows.length,
    };
  },
});

/** Get sync status summary for a user */
export const getMemorySyncStatus = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    const [pending, conflicts, synced] = await Promise.all([
      ctx.db.query("memories")
        .withIndex("by_owner_sync_status", (q) => q.eq("ownerDid", args.ownerDid).eq("syncStatus", "pending"))
        .collect(),
      ctx.db.query("memories")
        .withIndex("by_owner_sync_status", (q) => q.eq("ownerDid", args.ownerDid).eq("syncStatus", "conflict"))
        .collect(),
      ctx.db.query("memories")
        .withIndex("by_owner_sync_status", (q) => q.eq("ownerDid", args.ownerDid).eq("syncStatus", "synced"))
        .collect(),
    ]);

    const lastSyncedAt = Math.max(0, ...synced.map((m) => m.lastSyncedAt ?? 0));

    return {
      pendingCount: pending.length,
      conflictCount: conflicts.length,
      syncedCount: synced.length,
      lastSyncedAt: lastSyncedAt || undefined,
      hasUnresolved: conflicts.length > 0,
      needsSync: pending.length > 0,
    };
  },
});