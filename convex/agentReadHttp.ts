/**
 * HTTP read endpoints for agents.
 *
 * These GET handlers authenticate via resolveActor() (JWT session or agent
 * API key) and require read scopes. They wrap existing queries without changing
 * their logic, and resolve to a single current DID (no legacy/wallet threading).
 */

import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { AuthError, unauthorizedResponseWithCors } from "./lib/auth";
import { resolveActor, requireScope } from "./lib/actor";
import { jsonResponse, errorResponse } from "./lib/httpResponses";

/**
 * GET /api/v1/lists
 *
 * List the caller's lists. Requires the "lists:read" scope.
 * Response: { "lists": [...] }
 */
export const getLists = httpAction(async (ctx, request) => {
  try {
    const actor = await resolveActor(ctx, request);
    requireScope(actor, "lists:read");

    const lists = await ctx.runQuery(api.lists.getUserLists, {
      userDid: actor.did,
      legacyDid: actor.legacyDid,
    });
    return jsonResponse(request, { lists });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[agentReadHttp] getLists error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to get lists",
      500
    );
  }
});

/**
 * GET /api/v1/lists/items?listId=<id>
 *
 * Get a list and its items. Requires the "items:read" scope.
 * The Convex router has no :param path segments, so listId is a query param.
 * Response: { "list": {...} | null, "items": [...] }
 */
export const getListWithItems = httpAction(async (ctx, request) => {
  try {
    const actor = await resolveActor(ctx, request);
    requireScope(actor, "items:read");

    const listId = new URL(request.url).searchParams.get("listId");
    if (!listId) {
      return errorResponse(request, "listId query parameter is required");
    }

    // Authorized combined fetch: returns null if the list is missing OR the
    // caller may not view it, so an items:read key can't read arbitrary lists.
    const result = await ctx.runQuery(api.lists.getListWithItemsForViewer, {
      listId: listId as Id<"lists">,
      viewerDid: actor.did,
      legacyDid: actor.legacyDid,
    });
    if (!result) {
      return errorResponse(request, "List not found", 404);
    }
    return jsonResponse(request, result);
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[agentReadHttp] getListWithItems error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to get list items",
      500
    );
  }
});
