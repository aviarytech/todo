"use node";
/**
 * Push notification management — APNs (iOS) + Web Push/VAPID (Android/Web).
 * No Firebase dependency.
 */

import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Token registration ─────────────────────────────────────────────

/**
 * Register a push token (iOS APNs token or web push subscription).
 */
export const registerPushToken = mutation({
  args: {
    userDid: v.string(),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
    webPushKeys: v.optional(
      v.object({ p256dh: v.string(), auth: v.string() })
    ),
  },
  handler: async (ctx, args) => {
    // Upsert — check if token already exists
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userDid: args.userDid,
        platform: args.platform,
        webPushKeys: args.webPushKeys,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushTokens", {
      userDid: args.userDid,
      token: args.token,
      platform: args.platform,
      webPushKeys: args.webPushKeys,
      createdAt: Date.now(),
    });
  },
});

/**
 * Unregister a push token.
 */
export const unregisterPushToken = mutation({
  args: {
    token: v.string(),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const tok = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (tok && tok.userDid === args.userDid) {
      await ctx.db.delete(tok._id);
    }
  },
});

// ─── Queries ─────────────────────────────────────────────────────────

export const hasSubscription = query({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    // Check both legacy pushSubscriptions and new pushTokens
    const legacySub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userDid", args.userDid))
      .first();
    if (legacySub) return true;

    const token = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userDid", args.userDid))
      .first();
    return token !== null;
  },
});

export const getUserSubscriptions = query({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userDid", args.userDid))
      .collect();
  },
});

// Internal query for use in actions
export const getTokensForUser = internalQuery({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userDid", args.userDid))
      .collect();
  },
});

export const getTokensForList = internalQuery({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const collaborators = await ctx.db
      .query("collaborators")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const tokens = [];
    for (const collab of collaborators) {
      const userTokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_user", (q) => q.eq("userDid", collab.userDid))
        .collect();
      tokens.push(...userTokens);
    }
    return tokens;
  },
});

// ─── Legacy compatibility (keep saveSubscription/removeSubscription) ─

export const saveSubscription = mutation({
  args: {
    userDid: v.string(),
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() }),
  },
  handler: async (ctx, args) => {
    // Save to legacy table for backward compat
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { userDid: args.userDid, keys: args.keys });
      return existing._id;
    }
    return await ctx.db.insert("pushSubscriptions", {
      userDid: args.userDid,
      endpoint: args.endpoint,
      keys: args.keys,
      createdAt: Date.now(),
    });
  },
});

export const removeSubscription = mutation({
  args: { endpoint: v.string(), userDid: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (sub && sub.userDid === args.userDid) {
      await ctx.db.delete(sub._id);
    }
  },
});

// ─── Send push notification (action) ────────────────────────────────

/**
 * Send a push notification to a specific user.
 */
export const sendPushNotification = action({
  args: {
    userDid: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Array<{ token: string; platform: string; status: string; reason?: string }>> => {
    const tokens: Array<{ token: string; platform: string; webPushKeys?: { p256dh: string; auth: string } }> = await ctx.runQuery(internal.notifications.getTokensForUser, {
      userDid: args.userDid,
    });

    const results: PromiseSettledResult<void>[] = await Promise.allSettled(
      tokens.map((tok: { token: string; platform: string; webPushKeys?: { p256dh: string; auth: string } }) => {
        if (tok.platform === "ios") {
          return sendAPNs(args.title, args.body, args.data, tok.token);
        } else {
          return sendWebPush(args.title, args.body, args.data, tok.token, tok.webPushKeys!);
        }
      })
    );

    return results.map((r: PromiseSettledResult<void>, i: number) => ({
      token: tokens[i].token.substring(0, 10) + "...",
      platform: tokens[i].platform,
      status: r.status,
      reason: r.status === "rejected" ? String(r.reason) : undefined,
    }));
  },
});

/**
 * Send push notification to all users in a list.
 */
export const sendListNotification = action({
  args: {
    listId: v.id("lists"),
    excludeDid: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Array<{ platform: string; status: string }>> => {
    type TokenRecord = { userDid: string; token: string; platform: string; webPushKeys?: { p256dh: string; auth: string } };
    const tokens: TokenRecord[] = await ctx.runQuery(internal.notifications.getTokensForList, {
      listId: args.listId,
    });

    const filtered: TokenRecord[] = args.excludeDid
      ? tokens.filter((t: TokenRecord) => t.userDid !== args.excludeDid)
      : tokens;

    const results: PromiseSettledResult<void>[] = await Promise.allSettled(
      filtered.map((tok: TokenRecord) => {
        if (tok.platform === "ios") {
          return sendAPNs(args.title, args.body, args.data, tok.token);
        } else {
          return sendWebPush(args.title, args.body, args.data, tok.token, tok.webPushKeys!);
        }
      })
    );

    return results.map((r: PromiseSettledResult<void>, i: number) => ({
      platform: filtered[i].platform,
      status: r.status,
    }));
  },
});

// ─── APNs HTTP/2 sender ─────────────────────────────────────────────

async function createAPNsJWT(): Promise<string> {
  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;
  const privateKeyPem = process.env.APNS_PRIVATE_KEY!;

  // Parse PEM to raw key bytes
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  // Import key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Create JWT
  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format is not needed — SubtleCrypto ECDSA returns raw r||s
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signingInput}.${sigB64}`;
}

async function sendAPNs(
  title: string,
  body: string,
  data: unknown,
  deviceToken: string
): Promise<void> {
  const bundleId = process.env.APNS_BUNDLE_ID!;
  const jwt = await createAPNsJWT();

  const url = `https://api.push.apple.com/3/device/${deviceToken}`;

  const payload = {
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
    ...(data && typeof data === "object" ? data : {}),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`APNs error ${res.status}: ${text}`);
  }
}

// ─── Web Push (VAPID) sender ────────────────────────────────────────

async function sendWebPush(
  title: string,
  body: string,
  data: unknown,
  endpoint: string,
  keys: { p256dh: string; auth: string }
): Promise<void> {
  // Use the web-push library approach but implemented with crypto.subtle
  // For Convex actions, we need a pure JS implementation
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

  const payload = JSON.stringify({ title, body, data });

  // Import web-push compatible logic
  // We'll use a simplified approach — Convex actions can use npm packages
  const webpush = await import("web-push");

  webpush.setVapidDetails(
    "mailto:kgbot007@icloud.com",
    vapidPublicKey,
    vapidPrivateKey
  );

  await webpush.sendNotification(
    {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    },
    payload
  );
}
