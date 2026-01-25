/**
 * HTTP action handlers for protected category mutations.
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
 * POST /api/categories/create
 *
 * Create a new category. Requires authentication.
 *
 * Request: { "name": "..." }
 * Response: { "categoryId": "..." }
 */
export const createCategory = httpAction(async (ctx, request) => {
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
    const { name } = body as { name: string };

    if (!name) {
      return errorResponse("name is required");
    }

    // Call the mutation with server-verified DID
    const categoryId = await ctx.runMutation(api.categories.createCategory, {
      userDid: user.did,
      name,
      createdAt: Date.now(),
    });

    return jsonResponse({ categoryId });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[categoriesHttp] createCategory error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create category",
      500
    );
  }
});

/**
 * POST /api/categories/rename
 *
 * Rename a category. Requires authentication and ownership.
 *
 * Request: { "categoryId": "...", "name": "..." }
 * Response: { "success": true }
 */
export const renameCategory = httpAction(async (ctx, request) => {
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
    const { categoryId, name } = body as { categoryId: string; name: string };

    if (!categoryId || !name) {
      return errorResponse("categoryId and name are required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.categories.renameCategory, {
      categoryId: categoryId as Id<"categories">,
      userDid: user.did,
      name,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[categoriesHttp] renameCategory error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to rename category",
      500
    );
  }
});

/**
 * POST /api/categories/delete
 *
 * Delete a category. Requires authentication and ownership.
 *
 * Request: { "categoryId": "..." }
 * Response: { "success": true }
 */
export const deleteCategory = httpAction(async (ctx, request) => {
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
    const { categoryId } = body as { categoryId: string };

    if (!categoryId) {
      return errorResponse("categoryId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.categories.deleteCategory, {
      categoryId: categoryId as Id<"categories">,
      userDid: user.did,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[categoriesHttp] deleteCategory error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete category",
      500
    );
  }
});

/**
 * POST /api/categories/setListCategory
 *
 * Set a list's category. Requires authentication and list access.
 *
 * Request: { "listId": "...", "categoryId": "..." (optional, null to uncategorize) }
 * Response: { "success": true }
 */
export const setListCategory = httpAction(async (ctx, request) => {
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
    const { listId, categoryId } = body as { listId: string; categoryId?: string };

    if (!listId) {
      return errorResponse("listId is required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.categories.setListCategory, {
      listId: listId as Id<"lists">,
      categoryId: categoryId as Id<"categories">,
      userDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error("[categoriesHttp] setListCategory error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to set list category",
      500
    );
  }
});
