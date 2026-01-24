/**
 * HTTP action handlers for server-side OTP authentication.
 *
 * Uses @originals/auth/server for Turnkey OTP flow and JWT handling.
 * Sessions are stored in Convex authSessions table (no in-memory storage).
 */

import { httpAction } from "./_generated/server";
import {
  createTurnkeyClient,
  initiateEmailAuth,
  verifyEmailAuth,
  signToken,
  getAuthCookieConfig,
  getClearAuthCookieConfig,
  type SessionStorage,
} from "@originals/auth/server";
import type { EmailAuthSession } from "@originals/auth";
import { api } from "./_generated/api";

/**
 * Create a Convex-backed session storage adapter.
 *
 * This adapter wraps Convex mutations/queries to provide the SessionStorage
 * interface expected by @originals/auth/server.
 *
 * IMPORTANT: This is a workaround for the async nature of Convex.
 * The SessionStorage interface expects synchronous methods, but Convex
 * operations are async. We cache sessions in memory during request handling.
 */
function createConvexSessionStorage(
  ctx: {
    runMutation: (mutation: unknown, args: unknown) => Promise<unknown>;
    runQuery: (query: unknown, args: unknown) => Promise<unknown>;
  },
  sessionCache: Map<string, EmailAuthSession>
): SessionStorage {
  return {
    get: (sessionId: string) => sessionCache.get(sessionId),
    set: (sessionId: string, session: EmailAuthSession) => {
      sessionCache.set(sessionId, session);
    },
    delete: (sessionId: string) => {
      sessionCache.delete(sessionId);
    },
    cleanup: () => {
      sessionCache.clear();
    },
  };
}

/**
 * POST /auth/initiate
 *
 * Initiates email authentication by sending OTP to user's email.
 *
 * Request: { "email": "user@example.com" }
 * Response: { "sessionId": "...", "message": "..." }
 */
export const initiate = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const email = body.email as string;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[authHttp] Initiating auth for: ${email}`);

    // Create Turnkey client (uses env vars)
    const turnkeyClient = createTurnkeyClient();

    // Create session cache and storage adapter
    const sessionCache = new Map<string, EmailAuthSession>();
    const sessionStorage = createConvexSessionStorage(ctx, sessionCache);

    // Initiate email auth (sends OTP, creates session)
    const result = await initiateEmailAuth(email, turnkeyClient, sessionStorage);

    // Get the session from cache
    const session = sessionCache.get(result.sessionId);
    if (!session) {
      throw new Error("Session not created");
    }

    // Persist session to Convex database
    await ctx.runMutation(api.authSessions.createSession, {
      sessionId: result.sessionId,
      email: session.email,
      subOrgId: session.subOrgId,
      otpId: session.otpId,
    });

    console.log(`[authHttp] Session created: ${result.sessionId}`);

    return new Response(
      JSON.stringify({
        sessionId: result.sessionId,
        message: result.message,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[authHttp] Initiate error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to initiate auth",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * POST /auth/verify
 *
 * Verifies OTP code and issues JWT on success.
 *
 * Request: { "sessionId": "...", "code": "123456" }
 * Response: { "token": "...", "user": { ... } }
 */
export const verify = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const sessionId = body.sessionId as string;
    const code = body.code as string;

    if (!sessionId || !code) {
      return new Response(
        JSON.stringify({ error: "Session ID and code are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[authHttp] Verifying OTP for session: ${sessionId}`);

    // Get session from Convex database
    const dbSession = await ctx.runQuery(api.authSessions.getSession, { sessionId });
    if (!dbSession) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create Turnkey client
    const turnkeyClient = createTurnkeyClient();

    // Recreate session in cache for verifyEmailAuth
    const sessionCache = new Map<string, EmailAuthSession>();
    sessionCache.set(sessionId, {
      email: dbSession.email,
      subOrgId: dbSession.subOrgId,
      otpId: dbSession.otpId,
      timestamp: dbSession.timestamp,
      verified: dbSession.verified,
    });

    const sessionStorage = createConvexSessionStorage(ctx, sessionCache);

    // Verify OTP with Turnkey
    const result = await verifyEmailAuth(sessionId, code, turnkeyClient, sessionStorage);

    if (!result.verified) {
      return new Response(
        JSON.stringify({ error: "Verification failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[authHttp] OTP verified for: ${result.email}`);

    // Mark session as verified in database
    await ctx.runMutation(api.authSessions.markSessionVerified, {
      sessionId,
      subOrgId: result.subOrgId,
    });

    // Create user in database (upsert)
    // We need to get/create the user's DID here
    // For now, create a temporary DID; client will set proper DID
    const tempDid = `did:temp:${result.subOrgId}`;

    await ctx.runMutation(api.auth.upsertUser, {
      turnkeySubOrgId: result.subOrgId,
      email: result.email,
      did: tempDid,
      displayName: result.email.split("@")[0],
    });

    // Sign JWT
    const token = signToken(result.subOrgId, result.email);

    // Get cookie config
    const cookieConfig = getAuthCookieConfig(token);

    // Clean up session from database
    await ctx.runMutation(api.authSessions.deleteSession, { sessionId });

    console.log(`[authHttp] Auth complete, JWT issued for: ${result.email}`);

    // Build Set-Cookie header
    const cookieValue = `${cookieConfig.name}=${cookieConfig.value}; ` +
      `HttpOnly; ` +
      `Path=${cookieConfig.options.path}; ` +
      `Max-Age=${Math.floor(cookieConfig.options.maxAge / 1000)}; ` +
      `SameSite=${cookieConfig.options.sameSite}` +
      (cookieConfig.options.secure ? "; Secure" : "");

    return new Response(
      JSON.stringify({
        token,
        user: {
          turnkeySubOrgId: result.subOrgId,
          email: result.email,
          displayName: result.email.split("@")[0],
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieValue,
        },
      }
    );
  } catch (error) {
    console.error("[authHttp] Verify error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Verification failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * POST /auth/logout
 *
 * Clears the auth cookie.
 */
export const logout = httpAction(async () => {
  console.log("[authHttp] Logging out");

  const cookieConfig = getClearAuthCookieConfig();

  // Build Set-Cookie header to clear cookie
  const cookieValue = `${cookieConfig.name}=; ` +
    `HttpOnly; ` +
    `Path=${cookieConfig.options.path}; ` +
    `Max-Age=0; ` +
    `SameSite=${cookieConfig.options.sameSite}` +
    (cookieConfig.options.secure ? "; Secure" : "");

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    }
  );
});
