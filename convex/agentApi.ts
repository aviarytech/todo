/**
 * Agent API - HTTP endpoints for programmatic access to Poo App.
 *
 * These endpoints allow agents and scripts to interact with the app
 * without using a browser. All endpoints require JWT authentication.
 *
 * Endpoints:
 * - GET  /api/agent/lists            - Get all lists for the user
 * - GET  /api/agent/lists/:id        - Get a list with its items
 * - GET  /api/agent/lists/:id/items  - Get items for a list
 * - POST /api/agent/lists/:id/items  - Add an item to a list
 * - PATCH /api/agent/items/:id       - Update an item (check/uncheck/edit)
 * - DELETE /api/agent/items/:id      - Delete an item
 */

import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import {
  requireAuth,
  AuthError,
  unauthorizedResponseWithCors,
} from "./lib/auth";
import { jsonResponse, errorResponse, getCorsHeaders } from "./lib/httpResponses";

/**
 * Helper type for user info.
 */
type UserInfo = { did: string; legacyDid?: string } | null;

/**
 * Extract list ID from URL path.
 * Handles paths like /api/agent/lists/:id or /api/agent/lists/:id/items
 */
function extractListIdFromPath(url: string): string | null {
  const match = url.match(/\/api\/agent\/lists\/([a-z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Extract item ID from URL path.
 * Handles paths like /api/agent/items/:id
 */
function extractItemIdFromPath(url: string): string | null {
  const match = url.match(/\/api\/agent\/items\/([a-z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Get user from auth token.
 */
async function getAuthenticatedUser(
  ctx: ActionCtx,
  request: Request
): Promise<{ user: NonNullable<UserInfo>; auth: { turnkeySubOrgId: string; email: string } }> {
  const auth = await requireAuth(request);

  const user = await ctx.runQuery(api.auth.getUserByTurnkeyId, {
    turnkeySubOrgId: auth.turnkeySubOrgId,
  }) as UserInfo;

  if (!user) {
    throw new Error("User not found");
  }

  return { user, auth };
}

/**
 * Handle GET /api/agent/lists/:id - Get a list with all its items.
 */
async function handleGetListWithItems(
  ctx: ActionCtx,
  request: Request,
  listIdStr: string
): Promise<Response> {
  const { user } = await getAuthenticatedUser(ctx, request);
  const listId = listIdStr as Id<"lists">;

  // Get the list
  const list = await ctx.runQuery(api.lists.getList, { listId });
  if (!list) {
    return errorResponse(request, "List not found", 404);
  }

  // Check if user has access (owner or published list)
  const isOwner = list.ownerDid === user.did || list.ownerDid === user.legacyDid;
  
  if (!isOwner) {
    // Check if list is published
    const pubStatus = await ctx.runQuery(api.publication.getPublicationStatus, { listId });
    if (!pubStatus || pubStatus.status !== "active") {
      return errorResponse(request, "Access denied", 403);
    }
  }

  const role = isOwner ? "owner" : "editor";

  // Get items for the list
  const items = await ctx.runQuery(api.items.getListItems, { listId });

  return jsonResponse(request, {
    list: {
      _id: list._id,
      name: list.name,
      ownerDid: list.ownerDid,
      createdAt: list.createdAt,
      assetDid: list.assetDid,
    },
    items: items.map((item: {
      _id: Id<"items">;
      name: string;
      checked: boolean;
      createdByDid: string;
      checkedByDid?: string;
      createdAt: number;
      checkedAt?: number;
      order?: number;
      description?: string;
      dueDate?: number;
      url?: string;
      priority?: "high" | "medium" | "low";
    }) => ({
      _id: item._id,
      name: item.name,
      checked: item.checked,
      createdByDid: item.createdByDid,
      checkedByDid: item.checkedByDid,
      createdAt: item.createdAt,
      checkedAt: item.checkedAt,
      order: item.order,
      description: item.description,
      dueDate: item.dueDate,
      url: item.url,
      priority: item.priority,
    })),
    role,
  });
}

/**
 * Handle POST /api/agent/lists/:id/items - Add an item to a list.
 */
async function handleAddItemToList(
  ctx: ActionCtx,
  request: Request,
  listIdStr: string
): Promise<Response> {
  const { user } = await getAuthenticatedUser(ctx, request);

  // Parse request body
  const body = await request.json();
  const { name, description, priority, dueDate, url: itemUrl } = body as {
    name: string;
    description?: string;
    priority?: "high" | "medium" | "low";
    dueDate?: number;
    url?: string;
  };

  if (!name) {
    return errorResponse(request, "Item name is required", 400);
  }

  const listId = listIdStr as Id<"lists">;

  // Call the mutation with server-verified DID
  const itemId = await ctx.runMutation(api.items.addItem, {
    listId,
    name,
    createdByDid: user.did,
    legacyDid: user.legacyDid,
    createdAt: Date.now(),
    description,
    priority,
    dueDate,
    url: itemUrl,
  });

  return jsonResponse(request, {
    itemId,
    item: {
      _id: itemId,
      name,
      checked: false,
      createdByDid: user.did,
      description,
      priority,
      dueDate,
      url: itemUrl,
    },
  }, 201);
}

/**
 * Handle PATCH /api/agent/items/:id - Update an item.
 */
async function handleUpdateItem(
  ctx: ActionCtx,
  request: Request,
  itemIdStr: string
): Promise<Response> {
  const { user } = await getAuthenticatedUser(ctx, request);
  const itemId = itemIdStr as Id<"items">;

  // Parse request body
  const body = await request.json();
  const { checked, name, description, priority, dueDate, url: itemUrl } = body as {
    checked?: boolean;
    name?: string;
    description?: string;
    priority?: "high" | "medium" | "low" | null;
    dueDate?: number | null;
    url?: string | null;
  };

  // Handle checked state change
  if (checked === true) {
    await ctx.runMutation(api.items.checkItem, {
      itemId,
      checkedByDid: user.did,
      legacyDid: user.legacyDid,
      checkedAt: Date.now(),
    });
  } else if (checked === false) {
    await ctx.runMutation(api.items.uncheckItem, {
      itemId,
      userDid: user.did,
      legacyDid: user.legacyDid,
    });
  }

  // Handle other updates
  if (name !== undefined || description !== undefined || priority !== undefined || dueDate !== undefined || itemUrl !== undefined) {
    await ctx.runMutation(api.items.updateItem, {
      itemId,
      userDid: user.did,
      legacyDid: user.legacyDid,
      name,
      description,
      priority: priority === null ? undefined : priority,
      dueDate: dueDate === null ? undefined : dueDate,
      url: itemUrl === null ? undefined : itemUrl,
      clearPriority: priority === null,
      clearDueDate: dueDate === null,
      clearUrl: itemUrl === null,
    });
  }

  // Get updated item
  const updatedItem = await ctx.runQuery(api.items.getItemForSync, { itemId });

  return jsonResponse(request, {
    success: true,
    item: updatedItem,
  });
}

/**
 * Handle DELETE /api/agent/items/:id - Delete an item.
 */
async function handleDeleteItem(
  ctx: ActionCtx,
  request: Request,
  itemIdStr: string
): Promise<Response> {
  const { user } = await getAuthenticatedUser(ctx, request);
  const itemId = itemIdStr as Id<"items">;

  // Call the mutation with server-verified DID
  await ctx.runMutation(api.items.removeItem, {
    itemId,
    userDid: user.did,
    legacyDid: user.legacyDid,
  });

  return jsonResponse(request, { success: true });
}

/**
 * Handle GET /api/agent/lists - Get all lists for the user.
 */
async function handleGetUserLists(
  ctx: ActionCtx,
  request: Request
): Promise<Response> {
  const { user } = await getAuthenticatedUser(ctx, request);

  // Get all lists for the user
  const lists = await ctx.runQuery(api.lists.getUserLists, {
    userDid: user.did,
    legacyDid: user.legacyDid,
  });

  // Get roles for each list
  const listsWithRoles = await Promise.all(
    lists.map(async (list: { _id: Id<"lists">; name: string; ownerDid: string; createdAt: number; assetDid: string }) => {
      const isOwner = list.ownerDid === user.did || list.ownerDid === user.legacyDid;
      const role = isOwner ? "owner" : "editor";

      return {
        _id: list._id,
        name: list.name,
        ownerDid: list.ownerDid,
        createdAt: list.createdAt,
        role,
      };
    })
  );

  return jsonResponse(request, { lists: listsWithRoles });
}

// ============================================================================
// Exported HTTP Actions
// ============================================================================

/**
 * GET /api/agent/lists
 *
 * Get all lists the authenticated user has access to.
 */
export const getUserLists = httpAction(async (ctx, request) => {
  try {
    return await handleGetUserLists(ctx, request);
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[agentApi] getUserLists error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to get lists",
      500
    );
  }
});

/**
 * Router for /api/agent/lists/:id and /api/agent/lists/:id/items
 *
 * Handles:
 * - GET /api/agent/lists/:id - Get a specific list with items
 * - GET /api/agent/lists/:id/items - Get items for a list
 * - POST /api/agent/lists/:id/items - Add item to a list
 */
export const agentListHandler = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Extract list ID
    const listIdStr = extractListIdFromPath(path);
    if (!listIdStr) {
      return errorResponse(request, "List ID is required", 400);
    }

    // Check if this is the /items endpoint
    const isItemsEndpoint = path.endsWith("/items");

    if (request.method === "GET") {
      // Both /lists/:id and /lists/:id/items return the same data
      return await handleGetListWithItems(ctx, request, listIdStr);
    }

    if (request.method === "POST" && isItemsEndpoint) {
      return await handleAddItemToList(ctx, request, listIdStr);
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[agentApi] agentListHandler error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Request failed",
      500
    );
  }
});

/**
 * Router for /api/agent/items/:id
 *
 * Handles:
 * - PATCH /api/agent/items/:id - Update an item
 * - DELETE /api/agent/items/:id - Delete an item
 */
export const agentItemHandler = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Extract item ID
    const itemIdStr = extractItemIdFromPath(path);
    if (!itemIdStr) {
      return errorResponse(request, "Item ID is required", 400);
    }

    if (request.method === "PATCH") {
      return await handleUpdateItem(ctx, request, itemIdStr);
    }

    if (request.method === "DELETE") {
      return await handleDeleteItem(ctx, request, itemIdStr);
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[agentApi] agentItemHandler error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Request failed",
      500
    );
  }
});

/**
 * CORS preflight handler for agent API.
 */
export const corsHandler = httpAction(async (_ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
});
