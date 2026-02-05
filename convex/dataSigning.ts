"use node";

/**
 * Server-side arbitrary data signing via pooapp-signer service.
 *
 * Calls the external signer API instead of using Turnkey directly,
 * avoiding Convex bundler issues with the SDK's dependencies.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

const SIGNER_URL = process.env.SIGNER_URL || "https://pooapp-signer-production.up.railway.app";

/**
 * Sign arbitrary string data using the user's Turnkey-managed Ed25519 key.
 *
 * Returns the raw Ed25519 signature (hex-encoded r‖s) and the public key
 * (base58 address from Turnkey).
 */
export const signData = action({
  args: {
    data: v.string(),
    subOrgId: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log(
      `[dataSigning] Signing ${args.data.length} bytes of data (subOrg: ${args.subOrgId})`
    );

    const response = await fetch(`${SIGNER_URL}/sign-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: args.data,
        subOrgId: args.subOrgId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Signer error: ${error}`);
    }

    const result = await response.json();

    console.log(
      `[dataSigning] Signed data successfully (pubkey: ${result.publicKey})`
    );

    return result;
  },
});
