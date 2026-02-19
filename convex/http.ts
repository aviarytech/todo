/**
 * Convex HTTP router for server-side endpoints.
 *
 * Phase 8: Server-side authentication endpoints and protected mutations.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { createList, deleteList } from "./listsHttp";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  setListCategory,
} from "./categoriesHttp";
import {
  addItem,
  checkItem,
  uncheckItem,
  removeItem,
  reorderItems,
} from "./itemsHttp";
import { updateUserDID } from "./userHttp";
import {
  getUserLists as agentGetUserLists,
  agentListHandler,
  agentItemHandler,
  corsHandler as agentCorsHandler,
} from "./agentApi";

// Rate limit configuration
const RATE_LIMITS = {
  initiate: { windowMs: 60000, maxAttempts: 5 },
  verify: { windowMs: 60000, maxAttempts: 5 },
};

// Skip rate limiting in development
const SKIP_RATE_LIMIT = process.env.NODE_ENV !== "production";

/**
 * Helper to extract client IP from request headers.
 */
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return "unknown-ip";
}

/**
 * Get CORS headers for a request.
 * When credentials are included, we must echo the specific origin (not "*").
 */
function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Create a JSON response with CORS headers.
 */
function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
  request?: Request
): Response {
  const corsHeaders = request ? getCorsHeaders(request) : {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

/**
 * Create a 429 Too Many Requests response.
 */
function createRateLimitResponse(retryAfterMs: number, request: Request): Response {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  return jsonResponse(
    { error: "Too many requests. Please try again later.", retryAfterSeconds },
    429,
    { "Retry-After": String(retryAfterSeconds) },
    request
  );
}

// ============================================================================
// Auth HTTP Actions (call Node.js internal actions)
// ============================================================================

/**
 * POST /auth/initiate - Send OTP to user's email
 */
const initiate = httpAction(async (ctx, request) => {
  try {
    const clientIp = getClientIp(request);

    if (!SKIP_RATE_LIMIT) {
      const rateLimitResult = await ctx.runMutation(api.rateLimits.checkAndIncrement, {
        key: clientIp,
        endpoint: "initiate",
      });

      if (!rateLimitResult.allowed) {
        console.log(`[authHttp] Rate limit exceeded for IP: ${clientIp}`);
        return createRateLimitResponse(rateLimitResult.retryAfterMs ?? RATE_LIMITS.initiate.windowMs, request);
      }
    }

    const body = await request.json();
    const email = body.email as string;

    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400, {}, request);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400, {}, request);
    }

    console.log(`[authHttp] Initiating auth for: ${email} (IP: ${clientIp})`);

    // Call internal Node.js action
    const result = await ctx.runAction(internal.authInternal.initiateAuth, { email });

    // Persist session to Convex database
    await ctx.runMutation(api.authSessions.createSession, {
      sessionId: result.sessionId,
      email: result.session.email,
      subOrgId: result.session.subOrgId,
      otpId: result.session.otpId,
    });

    console.log(`[authHttp] Session created: ${result.sessionId}`);

    return jsonResponse({
      sessionId: result.sessionId,
      message: result.message,
    }, 200, {}, request);
  } catch (error) {
    console.error("[authHttp] Initiate error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Failed to initiate auth" },
      500,
      {},
      request
    );
  }
});

/**
 * POST /auth/verify - Verify OTP and issue JWT
 */
const verify = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const sessionId = body.sessionId as string;
    const code = body.code as string;

    if (!sessionId || !code) {
      return jsonResponse({ error: "Session ID and code are required" }, 400, {}, request);
    }

    if (!SKIP_RATE_LIMIT) {
      const rateLimitResult = await ctx.runMutation(api.rateLimits.checkAndIncrement, {
        key: sessionId,
        endpoint: "verify",
      });

      if (!rateLimitResult.allowed) {
        console.log(`[authHttp] Rate limit exceeded for session: ${sessionId}`);
        return createRateLimitResponse(rateLimitResult.retryAfterMs ?? RATE_LIMITS.verify.windowMs, request);
      }
    }

    console.log(`[authHttp] Verifying OTP for session: ${sessionId}`);

    // Get session from database
    const dbSession = await ctx.runQuery(api.authSessions.getSession, { sessionId });
    if (!dbSession) {
      return jsonResponse({ error: "Invalid or expired session" }, 400, {}, request);
    }

    // Validate required session fields
    if (!dbSession.subOrgId || !dbSession.otpId) {
      return jsonResponse({ error: "Invalid session state" }, 400, {}, request);
    }

    // Call internal Node.js action
    const result = await ctx.runAction(internal.authInternal.verifyAuth, {
      sessionId,
      code,
      session: {
        email: dbSession.email,
        subOrgId: dbSession.subOrgId,
        otpId: dbSession.otpId,
        timestamp: dbSession.timestamp,
        verified: dbSession.verified,
      },
    });

    if (!result.verified || !result.email || !result.subOrgId) {
      return jsonResponse({ error: "Verification failed" }, 400, {}, request);
    }

    console.log(`[authHttp] OTP verified for: ${result.email}`);

    // Mark session as verified
    await ctx.runMutation(api.authSessions.markSessionVerified, {
      sessionId,
      subOrgId: result.subOrgId,
    });

    // DID creation happens client-side after auth completes.
    // Server stores user without a DID; client creates did:webvh
    // using BrowserWebVHSigner and calls /api/user/updateDID.

    // Create/update user (no DID yet — client will create did:webvh and call /api/user/updateDID)
    await ctx.runMutation(api.auth.upsertUser, {
      turnkeySubOrgId: result.subOrgId,
      email: result.email,
      did: undefined,
      displayName: result.email.split("@")[0],
    });

    // Get JWT token via internal action
    const authResult = await ctx.runAction(internal.authInternal.createAuthToken, {
      subOrgId: result.subOrgId,
      email: result.email,
    });

    // Clean up session
    await ctx.runMutation(api.authSessions.deleteSession, { sessionId });

    console.log(`[authHttp] Auth complete, JWT issued for: ${result.email}`);

    return jsonResponse(
      {
        token: authResult.token,
        user: {
          turnkeySubOrgId: result.subOrgId,
          email: result.email,
          did: null,
          displayName: result.email.split("@")[0],
        },
      },
      200,
      { "Set-Cookie": authResult.cookieValue },
      request
    );
  } catch (error) {
    console.error("[authHttp] Verify error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Verification failed" },
      500,
      {},
      request
    );
  }
});

/**
 * POST /auth/logout - Clear auth cookie
 */
const logout = httpAction(async (ctx, request) => {
  console.log("[authHttp] Logging out");

  const result = await ctx.runAction(internal.authInternal.getLogoutCookie, {});

  return jsonResponse({ success: true }, 200, { "Set-Cookie": result.cookieValue }, request);
});

const http = httpRouter();

// Auth endpoints
http.route({
  path: "/auth/initiate",
  method: "POST",
  handler: initiate,
});

http.route({
  path: "/auth/verify",
  method: "POST",
  handler: verify,
});

http.route({
  path: "/auth/logout",
  method: "POST",
  handler: logout,
});

// CORS preflight handler
const corsHandler = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
});

// CORS preflight handling for all auth routes
http.route({ path: "/auth/initiate", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/auth/verify", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/auth/logout", method: "OPTIONS", handler: corsHandler });

// ============================================================================
// Protected API endpoints (Phase 8.3)
// All endpoints below require JWT authentication via Authorization header.
// ============================================================================

// --- List endpoints ---
http.route({ path: "/api/lists/create", method: "POST", handler: createList });
http.route({ path: "/api/lists/create", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/lists/delete", method: "POST", handler: deleteList });
http.route({ path: "/api/lists/delete", method: "OPTIONS", handler: corsHandler });

// --- Category endpoints ---
http.route({ path: "/api/categories/create", method: "POST", handler: createCategory });
http.route({ path: "/api/categories/create", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/categories/rename", method: "POST", handler: renameCategory });
http.route({ path: "/api/categories/rename", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/categories/delete", method: "POST", handler: deleteCategory });
http.route({ path: "/api/categories/delete", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/categories/setListCategory", method: "POST", handler: setListCategory });
http.route({ path: "/api/categories/setListCategory", method: "OPTIONS", handler: corsHandler });

// --- Item endpoints ---
http.route({ path: "/api/items/add", method: "POST", handler: addItem });
http.route({ path: "/api/items/add", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/items/check", method: "POST", handler: checkItem });
http.route({ path: "/api/items/check", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/items/uncheck", method: "POST", handler: uncheckItem });
http.route({ path: "/api/items/uncheck", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/items/remove", method: "POST", handler: removeItem });
http.route({ path: "/api/items/remove", method: "OPTIONS", handler: corsHandler });
http.route({ path: "/api/items/reorder", method: "POST", handler: reorderItems });
http.route({ path: "/api/items/reorder", method: "OPTIONS", handler: corsHandler });

// --- User endpoints ---
http.route({ path: "/api/user/updateDID", method: "POST", handler: updateUserDID });
http.route({ path: "/api/user/updateDID", method: "OPTIONS", handler: corsHandler });

// ============================================================================
// Agent API endpoints (RESTful API for programmatic access)
// All endpoints require JWT authentication via Authorization header.
// ============================================================================

// --- Agent List endpoints ---
// GET /api/agent/lists - Get all lists for the authenticated user
http.route({ path: "/api/agent/lists", method: "GET", handler: agentGetUserLists });
http.route({ path: "/api/agent/lists", method: "OPTIONS", handler: agentCorsHandler });

// Note: Convex httpRouter doesn't support path parameters like :id
// So we use prefix matching and parse the ID in the handler

// GET  /api/agent/lists/:id        - Get a specific list with items
// GET  /api/agent/lists/:id/items  - Get items for a list  
// POST /api/agent/lists/:id/items  - Add item to a list
http.route({ pathPrefix: "/api/agent/lists/", method: "GET", handler: agentListHandler });
http.route({ pathPrefix: "/api/agent/lists/", method: "POST", handler: agentListHandler });
http.route({ pathPrefix: "/api/agent/lists/", method: "OPTIONS", handler: agentCorsHandler });

// PATCH  /api/agent/items/:id - Update an item (check/uncheck/edit)
// DELETE /api/agent/items/:id - Delete an item
http.route({ pathPrefix: "/api/agent/items/", method: "PATCH", handler: agentItemHandler });
http.route({ pathPrefix: "/api/agent/items/", method: "DELETE", handler: agentItemHandler });
http.route({ pathPrefix: "/api/agent/items/", method: "OPTIONS", handler: agentCorsHandler });

export default http;
