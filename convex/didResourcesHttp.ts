/**
 * HTTP actions for serving DID logs and list resources at canonical paths.
 *
 * Resolution paths:
 *   GET /{userPath}/did.jsonl          → user's DID log (JSONL)
 *   GET /{userPath}/resources/list-{id} → list resource (JSON)
 */

import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Catch-all handler for /{userPath}/did.jsonl and /{userPath}/resources/list-{id}.
 * Convex pathPrefix routes match everything under a prefix, so we parse the URL ourselves.
 */
export const didResourceHandler = httpAction(async (ctx, request) => {
  const headers = corsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Strip leading slash and split
  const parts = pathname.replace(/^\//, "").split("/");

  if (parts.length < 2) {
    return new Response("Not found", { status: 404, headers });
  }

  const userPath = parts[0]; // e.g. "user-abc123"

  // /{userPath}/did.jsonl
  if (parts.length === 2 && parts[1] === "did.jsonl") {
    return await serveDidLog(ctx, userPath, headers);
  }

  // /{userPath}/resources/list-{listId}
  if (parts.length === 3 && parts[1] === "resources" && parts[2].startsWith("list-")) {
    const listId = parts[2].slice("list-".length);
    return await serveListResource(ctx, userPath, listId, headers);
  }

  return new Response("Not found", { status: 404, headers });
});

async function serveDidLog(
  ctx: { runQuery: Function },
  userPath: string,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const log = await ctx.runQuery(api.didLogs.getDidLogByPath, { path: userPath });

    if (!log) {
      return new Response("DID not found", {
        status: 404,
        headers: { "Content-Type": "text/plain", ...headers },
      });
    }

    return new Response(log, {
      status: 200,
      headers: {
        "Content-Type": "application/jsonl+json",
        "Cache-Control": "public, max-age=60",
        ...headers,
      },
    });
  } catch (error) {
    console.error("[didResources] Error serving DID log:", error);
    return new Response("Internal server error", { status: 500, headers });
  }
}

async function serveListResource(
  ctx: { runQuery: Function },
  userPath: string,
  listId: string,
  headers: Record<string, string>
): Promise<Response> {
  try {
    // Look up the user's DID from the didLogs table
    const didLogRecord = await ctx.runQuery(api.didLogs.getDidLogByPath, { path: userPath });
    if (!didLogRecord) {
      return new Response("User not found", { status: 404, headers });
    }

    // We need the userDid — query didLogs by path to get the full record
    const fullRecord = await ctx.runQuery(api.didLogs.getDidLogRecordByPath, { path: userPath });
    if (!fullRecord) {
      return new Response("User not found", { status: 404, headers });
    }

    const userDid = fullRecord.userDid;

    // Look up the list
    const list = await ctx.runQuery(api.didResources.getPublicList, {
      listId,
      ownerDid: userDid,
    });

    if (!list) {
      return new Response("List not found", {
        status: 404,
        headers: { "Content-Type": "text/plain", ...headers },
      });
    }

    // Get list items
    const items = await ctx.runQuery(api.didResources.getPublicListItems, {
      listId: list._id,
    });

    const checkedCount = items.filter((i: { checked: boolean }) => i.checked).length;

    // Build the resource response
    const resource = {
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: `${userDid}/resources/list-${listId}`,
      type: "PooList",
      controller: userDid,
      name: list.name,
      items: items.map((item: {
        name: string;
        checked: boolean;
        createdAt: number;
        checkedAt?: number;
        description?: string;
        priority?: string;
        dueDate?: number;
        order?: number;
      }) => ({
        name: item.name,
        checked: item.checked,
        createdAt: item.createdAt,
        ...(item.checkedAt && { checkedAt: item.checkedAt }),
        ...(item.description && { description: item.description }),
        ...(item.priority && { priority: item.priority }),
        ...(item.dueDate && { dueDate: item.dueDate }),
      })),
      createdAt: list.createdAt,
      itemCount: items.length,
      checkedCount,
    };

    return new Response(JSON.stringify(resource, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
        ...headers,
      },
    });
  } catch (error) {
    console.error("[didResources] Error serving list resource:", error);
    return new Response("Internal server error", { status: 500, headers });
  }
}
