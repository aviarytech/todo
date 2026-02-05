"use node";

/**
 * Server-side credential signing via pooapp-signer service.
 *
 * Calls the external signer API instead of importing SDK directly,
 * avoiding Convex bundler issues with the SDK's ESM/CJS dependencies.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

const SIGNER_URL = process.env.SIGNER_URL || "https://pooapp-signer-production.up.railway.app";

/**
 * Sign an item action as a verifiable credential using the signer service.
 */
export const signItemAction = action({
  args: {
    type: v.union(
      v.literal("ItemAdded"),
      v.literal("ItemChecked"),
      v.literal("ItemUnchecked"),
      v.literal("ItemRemoved")
    ),
    listDid: v.string(),
    itemId: v.string(),
    actorDid: v.string(),
    subOrgId: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log(
      `[credentialSigning] Signing ${args.type} credential for item ${args.itemId} (actor: ${args.actorDid})`
    );

    const response = await fetch(`${SIGNER_URL}/sign-credential`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: args.type,
        listDid: args.listDid,
        itemId: args.itemId,
        actorDid: args.actorDid,
        subOrgId: args.subOrgId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Signer error: ${error}`);
    }

    const result = await response.json();
    
    console.log(
      `[credentialSigning] Signed ${args.type} credential for item ${args.itemId}`
    );

    return result;
  },
});
