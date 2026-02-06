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
  unauthorizedResponseWithCors,
} from "./lib/auth";
import { jsonResponse, errorResponse } from "./lib/httpResponses";

/**
 * Helper type for user info.
 */
type UserInfo = { did: string; legacyDid?: string } | null;

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
      return errorResponse(request, "User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { assetDid, name, categoryId } = body as {
      assetDid: string;
      name: string;
      categoryId?: string;
    };

    if (!assetDid || !name) {
      return errorResponse(request, "assetDid and name are required");
    }

    // Call the mutation with server-verified DID
    const listId = await ctx.runMutation(api.lists.createList, {
      assetDid,
      name,
      ownerDid: user.did,
      categoryId: categoryId as unknown as undefined, // Optional category ID
      createdAt: Date.now(),
    });

    return jsonResponse(request, { listId });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[listsHttp] createList error:", error);
    return errorResponse(
      request,
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
      return errorResponse(request, "User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { listId } = body as { listId: string };

    if (!listId) {
      return errorResponse(request, "listId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.lists.deleteList, {
      listId: listId as Id<"lists">,
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse(request, { success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[listsHttp] deleteList error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to delete list",
      500
    );
  }
});
