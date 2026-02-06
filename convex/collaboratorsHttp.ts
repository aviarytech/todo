/**
 * HTTP action handlers for protected collaborator mutations.
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
 * POST /api/collaborators/add
 *
 * Add a collaborator to a list. Requires authentication.
 * Typically called after accepting an invite.
 *
 * Request: { "listId": "...", "userDid": "...", "role": "editor"|"viewer", "invitedByDid": "..." (optional) }
 * Response: { "collaboratorId": "..." }
 */
export const addCollaborator = httpAction(async (ctx, request) => {
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
    const { listId, userDid, role, invitedByDid } = body as {
      listId: string;
      userDid: string;
      role: "editor" | "viewer";
      invitedByDid?: string;
    };

    if (!listId || !userDid || !role) {
      return errorResponse(request, "listId, userDid, and role are required");
    }

    if (role !== "editor" && role !== "viewer") {
      return errorResponse(request, "role must be 'editor' or 'viewer'");
    }

    // Call the mutation with server-verified DID
    const collaboratorId = await ctx.runMutation(api.collaborators.addCollaborator, {
      listId: listId as Id<"lists">,
      userDid,
      role,
      invitedByDid,
      joinedAt: Date.now(),
    });

    return jsonResponse(request, { collaboratorId });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[collaboratorsHttp] addCollaborator error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to add collaborator",
      500
    );
  }
});

/**
 * POST /api/collaborators/updateRole
 *
 * Update a collaborator's role. Requires authentication and ownership.
 *
 * Request: { "listId": "...", "collaboratorDid": "...", "newRole": "editor"|"viewer" }
 * Response: { "success": true }
 */
export const updateCollaboratorRole = httpAction(async (ctx, request) => {
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
    const { listId, collaboratorDid, newRole } = body as {
      listId: string;
      collaboratorDid: string;
      newRole: "editor" | "viewer";
    };

    if (!listId || !collaboratorDid || !newRole) {
      return errorResponse(request, "listId, collaboratorDid, and newRole are required");
    }

    if (newRole !== "editor" && newRole !== "viewer") {
      return errorResponse(request, "newRole must be 'editor' or 'viewer'");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.collaborators.updateCollaboratorRole, {
      listId: listId as Id<"lists">,
      collaboratorDid,
      newRole,
      requesterDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse(request, { success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[collaboratorsHttp] updateCollaboratorRole error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to update collaborator role",
      500
    );
  }
});

/**
 * POST /api/collaborators/remove
 *
 * Remove a collaborator from a list. Requires authentication.
 * Owner can remove anyone. Users can remove themselves (leave).
 *
 * Request: { "listId": "...", "collaboratorDid": "..." }
 * Response: { "success": true }
 */
export const removeCollaborator = httpAction(async (ctx, request) => {
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
    const { listId, collaboratorDid } = body as {
      listId: string;
      collaboratorDid: string;
    };

    if (!listId || !collaboratorDid) {
      return errorResponse(request, "listId and collaboratorDid are required");
    }

    // Call the mutation with server-verified DID
    await ctx.runMutation(api.collaborators.removeCollaborator, {
      listId: listId as Id<"lists">,
      collaboratorDid,
      requesterDid: user.did,
      legacyDid: user.legacyDid,
    });

    return jsonResponse(request, { success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponseWithCors(request, error.message);
    }
    console.error("[collaboratorsHttp] removeCollaborator error:", error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Failed to remove collaborator",
      500
    );
  }
});
