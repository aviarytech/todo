/**
 * HTTP action handlers for protected list mutations.
 *
 * These endpoints require JWT authentication via requireAuth().
 * The user's DID is looked up server-side from their turnkeySubOrgId.
 */

import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  requireAuth,
  AuthError,
  unauthorizedResponse,
} from "./lib/auth";

/**
 * Helper type for user info.
 */
type UserInfo = { did: string; legacyDid?: string } | null;

/**
 * Standard JSON response helper.
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Standard error response helper.
 */
function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/lists/create
 *
 * Create a new list. Requires authentication.
 *
 * Request: { "assetDid": "...", "name": "...", "categoryId": "..." (optional) }
 * Response: { "listId": "..." }
 */
export const createList = httpAction(async (ctx, request) => {
  try {
    // Require authentication
    const auth = await requireAuth(request);

    // Get user's DID from their turnkeySubOrgId
    const user = await ctx.runQuery(api.auth.getUserByTurnkeyId, {
      turnkeySubOrgId: auth.turnkeySubOrgId,
    }) as UserInfo;
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { assetDid, name, categoryId } = body as {
      assetDid: string;
      name: string;
      categoryId?: string;
    };

    if (!assetDid || !name) {
      return errorResponse("assetDid and name are required");
    }

    // Call the mutation with server-verified DID
    const listId = await ctx.runMutation(api.lists.createList, {
      assetDid,
      name,
      ownerDid: user.did,
      categoryId: categoryId as unknown as undefined, // Optional category ID
      createdAt: Date.now(),
    });

    return jsonResponse({ listId });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[listsHttp] createList error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create list",
      500
    );
  }
});

/**
 * POST /api/lists/delete
 *
 * Delete a list. Requires authentication and ownership.
 *
 * Request: { "listId": "..." }
 * Response: { "success": true }
 */
export const deleteList = httpAction(async (ctx, request) => {
  try {
    // Require authentication
    const auth = await requireAuth(request);

    // Get user's DID from their turnkeySubOrgId
    const user = await ctx.runQuery(api.auth.getUserByTurnkeyId, {
      turnkeySubOrgId: auth.turnkeySubOrgId,
    }) as UserInfo;
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { listId } = body as { listId: string };

    if (!listId) {
      return errorResponse("listId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.lists.deleteList, {
      listId: listId as Id<"lists">,
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[listsHttp] deleteList error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete list",
      500
    );
  }
});
