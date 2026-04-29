import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function normalizedHostname(value: string | null): string | null {
  if (!value) return null;
  return value.split(":")[0].trim().toLowerCase();
}

export const resolveSiteHost = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(request.url);
  const hostname = normalizedHostname(url.searchParams.get("hostname"));
  if (!hostname) {
    return json({ status: "error", error: "hostname is required" }, 400);
  }

  const record = await ctx.runQuery(api.sites.getPublicSiteByHostname, {
    hostname,
  });

  if (!record) {
    return json({ status: "missing", hostname }, 404);
  }

  if (record.hostname.status === "redirected" && record.hostname.redirectTo) {
    return json({
      status: "redirect",
      hostname,
      location: `https://${record.hostname.redirectTo}`,
    });
  }

  if (record.hostname.status !== "active") {
    return json({
      status: "pending",
      hostname,
    });
  }

  const blob = await ctx.storage.get(record.file.storageId);
  if (!blob) {
    return json({ status: "missing", hostname }, 404);
  }

  return json({
    status: "active",
    hostname,
    siteId: record.site._id,
    did: record.site.did,
    scid: record.site.scid,
    primaryHostname: record.primaryHostname?.hostname ?? hostname,
    html: await blob.text(),
    contentType: record.file.contentType,
    sha256: record.file.sha256,
    didLogJsonl: record.didLogJsonl,
  });
});
