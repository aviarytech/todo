/**
 * Server-side arbitrary data signing via external worker.
 *
 * Uses the signing worker instead of importing @originals/auth directly,
 * keeping the Convex bundle small.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createSigningClient } from "./signingClient";

/**
 * Sign arbitrary data using the user's Turnkey-managed keys via external worker.
 */
export const signData = action({
  args: {
    data: v.string(),
    subOrgId: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log(`[dataSigning] Signing data for sub-org ${args.subOrgId}`);

    const signingSecret = process.env.SIGNING_SECRET;
    if (!signingSecret) {
      throw new Error("SIGNING_SECRET not configured");
    }

    const client = createSigningClient(signingSecret);
    
    const result = await client.signData(args.data, args.subOrgId);

    console.log(`[dataSigning] Data signed, public key: ${result.publicKey}`);

    return result;
  },
});
