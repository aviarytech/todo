/**
 * Authentication helper for protecting Convex HTTP actions.
 *
 * Extracts and validates JWT from HTTP requests.
 */

import {
  verifyAuthToken,
  extractTokenFromRequest,
  type AuthTokenPayload,
} from "./jwt";

export type { AuthTokenPayload };

/**
 * Error thrown when authentication fails.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORIZED" | "INVALID_TOKEN" | "EXPIRED_TOKEN"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Require authentication for an HTTP action.
 *
 * Extracts JWT from the request's Authorization header or auth_token cookie,
 * validates it, and returns the authenticated user's payload.
 *
 * @param request - HTTP request object from the action handler
 * @returns Authenticated user payload with turnkeySubOrgId and email
 * @throws AuthError if no token is present, token is invalid, or token is expired
 *
 * @example
 * ```typescript
 * export const protectedAction = httpAction(async (ctx, request) => {
 *   const auth = requireAuth(request);
 *   // auth.turnkeySubOrgId and auth.email are now available
 * });
 * ```
 */
export function requireAuth(request: Request): AuthTokenPayload {
  // Extract token from request
  const token = extractTokenFromRequest(request);

  if (!token) {
    throw new AuthError(
      "Authentication required",
      "UNAUTHORIZED"
    );
  }

  try {
    // Verify and decode the token
    return verifyAuthToken(token);
  } catch (error) {
    // Map specific error messages to error codes
    const message = error instanceof Error ? error.message : "Invalid token";

    if (message.includes("expired")) {
      throw new AuthError("Token has expired", "EXPIRED_TOKEN");
    }

    throw new AuthError(message, "INVALID_TOKEN");
  }
}

/**
 * Try to get authentication from a request without throwing.
 *
 * Useful for endpoints that support both authenticated and anonymous access.
 *
 * @param request - HTTP request object
 * @returns Authenticated user payload or null if not authenticated
 */
export function tryAuth(request: Request): AuthTokenPayload | null {
  try {
    return requireAuth(request);
  } catch {
    return null;
  }
}

/**
 * Create an unauthorized error response.
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Create a forbidden error response.
 */
export function forbiddenResponse(message = "Forbidden"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}
