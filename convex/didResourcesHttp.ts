/**
 * HTTP actions for serving DID logs and list resources at canonical paths.
 *
 * Resolution paths:
 *   GET  /{userPath}/did.jsonl                            → user's DID log (JSONL)
 *   GET  /{userPath}/resources/list-{id}                  → list resource (JSON)
 *   POST /{userPath}/resources/list-{id}/items            → add item
 *   POST /{userPath}/resources/list-{id}/items/{id}/check → check item
 *   POST /{userPath}/resources/list-{id}/items/{id}/uncheck → uncheck item
 */

import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Catch-all handler for DID resolution, resource serving, and resource mutations.
 */
export const didResourceHandler = httpAction(async (ctx, request) => {
  const headers = corsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  const parts = pathname.replace(/^\//, "").split("/");

  if (parts.length < 2) {
    return new Response("Not found", { status: 404, headers });
  }

  const userPath = parts[0];

  // GET /{userPath}/did.jsonl
  if (request.method === "GET" && parts.length === 2 && parts[1] === "did.jsonl") {
    return await serveDidLog(ctx, userPath, headers);
  }

  // /{userPath}/resources/list-{listId}/...
  if (parts.length >= 3 && parts[1] === "resources" && parts[2].startsWith("list-")) {
    const listId = parts[2].slice("list-".length);

    // GET /{userPath}/resources/list-{listId}
    if (request.method === "GET" && parts.length === 3) {
      return await serveListResource(ctx, userPath, listId, headers);
    }

    // POST /{userPath}/resources/list-{listId}/items
    if (request.method === "POST" && parts.length === 4 && parts[3] === "items") {
      return await addItem(ctx, request, userPath, listId, headers);
    }

    // POST /{userPath}/resources/list-{listId}/items/{itemId}/check
    if (request.method === "POST" && parts.length === 6 && parts[3] === "items" && parts[5] === "check") {
      return await toggleItem(ctx, userPath, listId, parts[4], true, headers);
    }

    // POST /{userPath}/resources/list-{listId}/items/{itemId}/uncheck
    if (request.method === "POST" && parts.length === 6 && parts[3] === "items" && parts[5] === "uncheck") {
      return await toggleItem(ctx, userPath, listId, parts[4], false, headers);
    }
  }

  return new Response("Not found", { status: 404, headers });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveUserDid(
  ctx: { runQuery: Function },
  userPath: string
): Promise<string | null> {
  const record = await ctx.runQuery(api.didLogs.getDidLogRecordByPath, { path: userPath });
  return record?.userDid ?? null;
}

async function resolveList(
  ctx: { runQuery: Function },
  userPath: string,
  listId: string
): Promise<{ userDid: string; list: any } | null> {
  const userDid = await resolveUserDid(ctx, userPath);
  if (!userDid) return null;

  const list = await ctx.runQuery(api.didResources.getPublicList, {
    listId,
    ownerDid: userDid,
  });
  if (!list) return null;

  return { userDid, list };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function serveDidLog(
  ctx: { runQuery: Function },
  userPath: string,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const log = await ctx.runQuery(api.didLogs.getDidLogByPath, { path: userPath });
    if (!log) {
      return new Response("DID not found", { status: 404, headers });
    }
    return new Response(log, {
      status: 200,
      headers: { "Content-Type": "application/jsonl+json", "Cache-Control": "public, max-age=60", ...headers },
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
    const resolved = await resolveList(ctx, userPath, listId);
    if (!resolved) {
      return new Response("List not found", { status: 404, headers });
    }

    const { userDid, list } = resolved;
    const items = await ctx.runQuery(api.didResources.getPublicListItems, { listId: list._id });
    const checkedCount = items.filter((i: { checked: boolean }) => i.checked).length;

    // Get the publication credential if it exists
    const publication = await ctx.runQuery(api.didResources.getPublicationCredential, { listId: list._id });

    const resource: Record<string, unknown> = {
      "@context": ["https://www.w3.org/ns/did/v1", "https://www.w3.org/2018/credentials/v1"],
      id: `${userDid}/resources/list-${listId}`,
      type: "PooList",
      controller: userDid,
      name: list.name,
      items: items.map((item: any) => ({
        _id: item._id,
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

    // Include the signed VC if available
    if (publication?.credential) {
      try {
        resource.credential = JSON.parse(publication.credential);
      } catch {
        // Ignore malformed credential
      }
    }

    return new Response(JSON.stringify(resource, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=5", ...headers },
    });
  } catch (error) {
    console.error("[didResources] Error serving list resource:", error);
    return new Response("Internal server error", { status: 500, headers });
  }
}

async function toggleItem(
  ctx: { runQuery: Function; runMutation: Function },
  userPath: string,
  listId: string,
  itemId: string,
  check: boolean,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const resolved = await resolveList(ctx, userPath, listId);
    if (!resolved) {
      return new Response("List not found", { status: 404, headers });
    }

    // Use the shared resource mutations
    if (check) {
      await ctx.runMutation(api.didResources.checkSharedItem, {
        itemId,
        listId: resolved.list._id,
        actorDid: "anonymous",
      });
    } else {
      await ctx.runMutation(api.didResources.uncheckSharedItem, {
        itemId,
        listId: resolved.list._id,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (error) {
    console.error("[didResources] Error toggling item:", error);
    return new Response("Internal server error", { status: 500, headers });
  }
}

async function addItem(
  ctx: { runQuery: Function; runMutation: Function },
  request: Request,
  userPath: string,
  listId: string,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const resolved = await resolveList(ctx, userPath, listId);
    if (!resolved) {
      return new Response("List not found", { status: 404, headers });
    }

    const body = await request.json() as { name?: string };
    if (!body.name?.trim()) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    const itemId = await ctx.runMutation(api.didResources.addSharedItem, {
      listId: resolved.list._id,
      name: body.name.trim(),
      actorDid: "anonymous",
    });

    return new Response(JSON.stringify({ ok: true, itemId }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (error) {
    console.error("[didResources] Error adding item:", error);
    return new Response("Internal server error", { status: 500, headers });
  }
}
