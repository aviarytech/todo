"use node";

/**
 * Server-side DID creation via pooapp-signer service.
 *
 * Calls the external signer API instead of importing SDK directly,
 * avoiding Convex bundler issues with the SDK's ESM/CJS dependencies.
 */

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

const SIGNER_URL = process.env.SIGNER_URL || "https://pooapp-signer-production.up.railway.app";

/**
 * Create a did:webvh DID for a user during OTP verification.
 * Internal action - called from HTTP auth endpoint.
 */
export const createDIDWebVH = internalAction({
  args: {
    subOrgId: v.string(),
    email: v.string(),
  },
  handler: async (_ctx, args): Promise<{ did: string }> => {
    console.log(
      `[didCreation] Creating user did:webvh for ${args.email} (subOrg: ${args.subOrgId})`
    );

    const response = await fetch(`${SIGNER_URL}/create-user-did`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subOrgId: args.subOrgId,
        email: args.email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Signer error: ${error}`);
    }

    const result = await response.json();
    
    console.log(`[didCreation] Created user did:webvh: ${result.did}`);
    return { did: result.did };
  },
});

/**
 * Create a did:webvh DID for list publication.
 * Public action - called from client when publishing a list.
 */
export const createListDID = action({
  args: {
    subOrgId: v.string(),
    domain: v.string(),
    slug: v.string(),
  },
  handler: async (_ctx, args): Promise<{
    did: string;
    didDocument: unknown;
    didLog: unknown;
  }> => {
    console.log(
      `[didCreation] Creating list did:webvh for slug: ${args.slug} (subOrg: ${args.subOrgId})`
    );

    const response = await fetch(`${SIGNER_URL}/create-list-did`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subOrgId: args.subOrgId,
        domain: args.domain,
        slug: args.slug,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Signer error: ${error}`);
    }

    const result = await response.json();
    
    console.log(`[didCreation] Created list did:webvh: ${result.did}`);
    return result;
  },
});
