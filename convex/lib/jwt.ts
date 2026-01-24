/**
 * JWT validation helper for Convex mutations.
 *
 * Uses @originals/auth/server for token verification.
 */

import { verifyToken } from "@originals/auth/server";

/**
 * Result of a successful token verification.
 */
export interface AuthTokenPayload {
  /** Turnkey sub-organization ID (stable user identifier) */
  turnkeySubOrgId: string;
  /** User's email address */
  email: string;
  /** Optional Turnkey session token for wallet operations */
  sessionToken?: string;
}

/**
 * Verify a JWT auth token and return the decoded payload.
 *
 * @param token - JWT token string
 * @returns Decoded token payload with turnkeySubOrgId and email
 * @throws Error if token is invalid, expired, or missing required fields
 */
export function verifyAuthToken(token: string): AuthTokenPayload {
  if (!token) {
    throw new Error("Token is required");
  }

  // verifyToken throws on invalid/expired tokens
  const payload = verifyToken(token);

  // Validate required fields
  if (!payload.sub) {
    throw new Error("Token missing sub-organization ID");
  }
  if (!payload.email) {
    throw new Error("Token missing email");
  }

  return {
    turnkeySubOrgId: payload.sub,
    email: payload.email,
    sessionToken: payload.sessionToken,
  };
}

/**
 * Extract JWT token from an HTTP request.
 *
 * Checks Authorization header first (Bearer token), then falls back to auth_token cookie.
 *
 * @param request - HTTP request object
 * @returns JWT token string or null if not found
 */
export function extractTokenFromRequest(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7); // Remove "Bearer " prefix
  }

  // Fall back to cookie
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies.auth_token) {
      return cookies.auth_token;
    }
  }

  return null;
}

/**
 * Parse a cookie header string into key-value pairs.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split("=");
    if (name) {
      cookies[name] = rest.join("="); // Handle values with = in them
    }
  }

  return cookies;
}
