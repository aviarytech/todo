/**
 * HTTP action handlers for user-related mutations.
 *
 * These endpoints require JWT authentication via requireAuth().
 */

import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import {
  requireAuth,
  AuthError,
  unauthorizedResponseWithCors,
} from "./lib/auth";
import { jsonResponse, errorResponse } from "./lib/httpResponses";

/**
 * POST /api/user/updateDID
 *
 * Update the authenticated user's DID. Used after client-side DID creation
 * to upgrade from did:temp to did:webvh.
 *
 * Request: { "did": "did:webvh:..." }
 * Response: { "success": true, "did": "..." }
 */
export const updateUserDID = httpAction(async (ctx, request) => {
  try {
    // Require authentication
    const auth = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const { did } = body as { did: string };

    if (!did) {
      return errorResponse(request, "did is required");
    }

    // Validate DID format (must be did:webvh, not did:temp)
    if (did.startsWith("did:temp:")) {
      return errorResponse(request, "Cannot update to a temporary DID");
    }

    if (!did.startsWith("did:webvh:") && !did.startsWith("did:key:")) {
      return errorResponse(request, "Invalid DID format. Expected did:webvh or did:key");
    }

    console.log(`[userHttp] Updating DID for ${auth.email} to ${did}`);

    // Call upsertUser which handles the DID upgrade logic
    await ctx.runMutation(api.auth.upsertUser, {
      turnkeySubOrgId: auth.turnkeySubOrgId,
      email: auth.email,
      did,
    });

    console.log(`[userHttp] DID updated successfully for ${auth.email}`);

    return jsonResponse(request, { success: true, did });
  } catch (err) {
    if (err instanceof AuthError) {
      return unauthorizedResponseWithCors(request, err.message);
    }
    console.error("[userHttp] Update DID error:", err);
    return errorResponse(
      request,
      err instanceof Error ? err.message : "Failed to update DID",
      500
    );
  }
});
