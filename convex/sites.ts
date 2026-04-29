import { v } from "convex/values";
import { query } from "./_generated/server";

export const listSites = query({
  args: { ownerDid: v.string() },
  handler: async (ctx, args) => {
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_owner", (q) => q.eq("ownerDid", args.ownerDid))
      .order("desc")
      .collect();

    return Promise.all(
      sites.map(async (site) => {
        const primaryHostname = site.primaryHostnameId
          ? await ctx.db.get(site.primaryHostnameId)
          : null;
        return { ...site, primaryHostname };
      })
    );
  },
});

export const getSite = query({
  args: {
    siteId: v.id("sites"),
    ownerDid: v.string(),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site || site.ownerDid !== args.ownerDid) return null;

    const [file, key, hostnames, didLogEntries] = await Promise.all([
      ctx.db.get(site.fileId),
      ctx.db
        .query("siteKeys")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .first(),
      ctx.db
        .query("siteHostnames")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
      ctx.db
        .query("siteDidLogEntries")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
    ]);

    const primaryHostname =
      site.primaryHostnameId != null ? await ctx.db.get(site.primaryHostnameId) : null;

    return {
      ...site,
      file,
      publicKeyMultibase: key?.publicKeyMultibase ?? null,
      hostnames,
      primaryHostname,
      didLogJsonl: didLogEntries
        .sort((a, b) => a.signedAt - b.signedAt)
        .map((entry) => entry.entryJsonl)
        .join("\n"),
    };
  },
});

export const getPublicSiteByHostname = query({
  args: { hostname: v.string() },
  handler: async (ctx, args) => {
    const normalizedHostname = args.hostname.toLowerCase();
    const hostname = await ctx.db
      .query("siteHostnames")
      .withIndex("by_hostname", (q) => q.eq("hostname", normalizedHostname))
      .first();

    if (!hostname) return null;
    const site = await ctx.db.get(hostname.siteId);
    if (!site) return null;
    const file = await ctx.db.get(site.fileId);
    if (!file) return null;
    const didLogEntries = await ctx.db
      .query("siteDidLogEntries")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();

    const primaryHostname =
      site.primaryHostnameId != null ? await ctx.db.get(site.primaryHostnameId) : null;

    return {
      site,
      hostname,
      primaryHostname,
      file: {
        content: file.content,
        contentType: file.contentType,
        sha256: file.sha256,
        byteLength: file.byteLength,
      },
      didLogJsonl: didLogEntries
        .sort((a, b) => a.signedAt - b.signedAt)
        .map((entry) => entry.entryJsonl)
        .join("\n"),
    };
  },
});
