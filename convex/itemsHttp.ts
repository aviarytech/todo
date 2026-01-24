/**
 * HTTP action handlers for protected item mutations.
 *
 * These endpoints require JWT authentication via requireAuth().
 * The user's DID is looked up server-side from their turnkeySubOrgId.
 */

import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import {
  requireAuth,
  AuthError,
  unauthorizedResponse,
} from "./lib/auth";

/**
 * Helper to get user info from turnkeySubOrgId.
 */
async function getUserFromAuth(
  ctx: { runQuery: (query: unknown, args: unknown) => Promise<unknown> },
  turnkeySubOrgId: string
): Promise<{ did: string; legacyDid?: string } | null> {
  const user = await ctx.runQuery(api.auth.getUserByTurnkeyId, {
    turnkeySubOrgId,
  }) as { did: string; legacyDid?: string } | null;
  return user;
}

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
    const auth = requireAuth(request);

    // Get user's DID from their turnkeySubOrgId
    const user = await getUserFromAuth(ctx, auth.turnkeySubOrgId);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { listId, name } = body as { listId: string; name: string };

    if (!listId || !name) {
      return errorResponse("listId and name are required");
    }

    // Call the mutation with server-verified DID
    const itemId = await ctx.runMutation(api.items.addItem, {
      listId: listId as unknown as ReturnType<typeof api.items.addItem>["_args"]["listId"],
      name,
      createdByDid: user.did,
      legacyDid: user.legacyDid,
      createdAt: Date.now(),
    });

    return jsonResponse({ itemId });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[itemsHttp] addItem error:", error);
    return errorResponse(
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
    const auth = requireAuth(request);

    // Get user's DID from their turnkeySubOrgId
    const user = await getUserFromAuth(ctx, auth.turnkeySubOrgId);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { itemId } = body as { itemId: string };

    if (!itemId) {
      return errorResponse("itemId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.checkItem, {
      itemId: itemId as unknown as ReturnType<typeof api.items.checkItem>["_args"]["itemId"],
      checkedByDid: user.did,
      legacyDid: user.legacyDid,
      checkedAt: Date.now(),
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[itemsHttp] checkItem error:", error);
    return errorResponse(
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
    const auth = requireAuth(request);

    // Get user's DID from their turnkeySubOrgId
    const user = await getUserFromAuth(ctx, auth.turnkeySubOrgId);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { itemId } = body as { itemId: string };

    if (!itemId) {
      return errorResponse("itemId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.uncheckItem, {
      itemId: itemId as unknown as ReturnType<typeof api.items.uncheckItem>["_args"]["itemId"],
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[itemsHttp] uncheckItem error:", error);
    return errorResponse(
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
    const auth = requireAuth(request);

    // Get user's DID from their turnkeySubOrgId
    const user = await getUserFromAuth(ctx, auth.turnkeySubOrgId);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { itemId } = body as { itemId: string };

    if (!itemId) {
      return errorResponse("itemId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.removeItem, {
      itemId: itemId as unknown as ReturnType<typeof api.items.removeItem>["_args"]["itemId"],
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[itemsHttp] removeItem error:", error);
    return errorResponse(
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
    const auth = requireAuth(request);

    // Get user's DID from their turnkeySubOrgId
    const user = await getUserFromAuth(ctx, auth.turnkeySubOrgId);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Parse request body
    const body = await request.json();
    const { listId, itemIds } = body as { listId: string; itemIds: string[] };

    if (!listId || !itemIds || !Array.isArray(itemIds)) {
      return errorResponse("listId and itemIds array are required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.items.reorderItems, {
      listId: listId as unknown as ReturnType<typeof api.items.reorderItems>["_args"]["listId"],
      itemIds: itemIds as unknown as ReturnType<typeof api.items.reorderItems>["_args"]["itemIds"],
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[itemsHttp] reorderItems error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to reorder items",
      500
    );
  }
});
