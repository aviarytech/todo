/**
 * Server-side DID creation via external signing worker.
 *
 * Uses the signing worker instead of importing @originals/auth directly,
 * keeping the Convex bundle small.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createSigningClient } from "./signingClient";

/**
 * Create a did:webvh DID for a user using the external signing worker.
 */
export const createDID = action({
  args: {
    subOrgId: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log(`[didCreation] Creating DID for sub-org ${args.subOrgId}`);

    const signingSecret = process.env.SIGNING_SECRET;
    const webvhDomain = process.env.WEBVH_DOMAIN;
    
    if (!signingSecret) {
      throw new Error("SIGNING_SECRET not configured");
    }
    if (!webvhDomain) {
      throw new Error("WEBVH_DOMAIN not configured");
    }

    const client = createSigningClient(signingSecret);
    
    const result = await client.createDID(args.subOrgId, webvhDomain);

    console.log(`[didCreation] Created DID: ${result.did}`);

    return result;
  },
});
