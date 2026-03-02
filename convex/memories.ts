import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const memorySource = v.union(v.literal("manual"), v.literal("openclaw"), v.literal("clawboot"), v.literal("import"), v.literal("api"));

export const createMemory = mutation({
  args: { ownerDid: v.string(), authorDid: v.string(), title: v.string(), content: v.string(), tags: v.optional(v.array(v.string())), source: v.optional(memorySource), sourceRef: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("title and content are required");
    const tags = args.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean);
    return await ctx.db.insert("memories", {
      ownerDid: args.ownerDid,
      authorDid: args.authorDid,
      title,
      content,
      searchText: `${title}\n${content}`,
      tags: tags?.length ? Array.from(new Set(tags)) : undefined,
      source: args.source,
      sourceRef: args.sourceRef,
      createdAt: now,
      updatedAt: now,
    });
  }
});

export const listMemories = query({
  args: { ownerDid: v.string(), query: v.optional(v.string()), tag: v.optional(v.string()), source: v.optional(memorySource), limit: v.optional(v.number()) },
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
    const memories = rows.filter((m) => (tag ? (m.tags ?? []).includes(tag) : true)).slice(0, limit);
    const availableTags = Array.from(new Set(memories.flatMap((m) => m.tags ?? []))).sort((a, b) => a.localeCompare(b));
    return { memories, availableTags };
  }
});
