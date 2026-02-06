/**
 * HTTP action handlers for protected item mutations.
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
 * POST /api/items/add
 *
 * Add an item to a list. Requires authentication and edit access.
 *
 * Request: { "listId": "...", "name": "..." }
 * Response: { "itemId": "..." }
 */
export const addItem = httpAction(async (ctx, request) => {
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
    const { listId, name } = body as { listId: string; name: string };

    if (!listId || !name) {
      return errorResponse(request, "listId and name are required");
    }

    // Call the mutation with server-verified DID
    const itemId = await ctx.runMutation(api.items.addItem, {
      listId: listId as Id<"lists">,
      name,
      createdByDid: user.did,
      legacyDid: user.legacyDid,
      createdAt: Date.now(),
    });

    return jsonResponse(request, { itemId });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[itemsHttp] addItem error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to add item",
      500
    );
  }
});

/**
 * POST /api/items/check
 *
 * Check (mark as complete) an item. Requires authentication and edit access.
 *
 * Request: { "itemId": "..." }
 * Response: { "success": true }
 */
export const checkItem = httpAction(async (ctx, request) => {
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
    const { itemId } = body as { itemId: string };

    if (!itemId) {
      return errorResponse(request, "itemId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.checkItem, {
      itemId: itemId as Id<"items">,
      checkedByDid: user.did,
      legacyDid: user.legacyDid,
      checkedAt: Date.now(),
    });

    return jsonResponse(request, { success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[itemsHttp] checkItem error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to check item",
      500
    );
  }
});

/**
 * POST /api/items/uncheck
 *
 * Uncheck an item. Requires authentication and edit access.
 *
 * Request: { "itemId": "..." }
 * Response: { "success": true }
 */
export const uncheckItem = httpAction(async (ctx, request) => {
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
    const { itemId } = body as { itemId: string };

    if (!itemId) {
      return errorResponse(request, "itemId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.uncheckItem, {
      itemId: itemId as Id<"items">,
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse(request, { success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[itemsHttp] uncheckItem error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to uncheck item",
      500
    );
  }
});

/**
 * POST /api/items/remove
 *
 * Remove an item. Requires authentication and edit access.
 *
 * Request: { "itemId": "..." }
 * Response: { "success": true }
 */
export const removeItem = httpAction(async (ctx, request) => {
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
    const { itemId } = body as { itemId: string };

    if (!itemId) {
      return errorResponse(request, "itemId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.removeItem, {
      itemId: itemId as Id<"items">,
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse(request, { success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[itemsHttp] removeItem error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to remove item",
      500
    );
  }
});

/**
 * POST /api/items/reorder
 *
 * Reorder items in a list. Requires authentication and edit access.
 *
 * Request: { "listId": "...", "itemIds": ["...", "..."] }
 * Response: { "success": true }
 */
export const reorderItems = httpAction(async (ctx, request) => {
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
    const { listId, itemIds } = body as { listId: string; itemIds: string[] };

    if (!listId || !itemIds || !Array.isArray(itemIds)) {
      return errorResponse(request, "listId and itemIds array are required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.reorderItems, {
      listId: listId as Id<"lists">,
      itemIds: itemIds as Id<"items">[],
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse(request, { success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[itemsHttp] reorderItems error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to reorder items",
      500
    );
  }
});
