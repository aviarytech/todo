/**
 * Server-side credential signing via external worker.
 *
 * Uses the signing worker instead of importing @originals/auth directly,
 * keeping the Convex bundle small (no Turnkey crypto dependencies).
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createSigningClient } from "./signingClient";

/**
 * Sign an item action as a verifiable credential using the external signing worker.
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

    const signingSecret = process.env.SIGNING_SECRET;
    if (!signingSecret) {
      throw new Error("SIGNING_SECRET not configured");
    }

    const client = createSigningClient(signingSecret);
    
    const result = await client.signItemAction({
      type: args.type,
      listDid: args.listDid,
      itemId: args.itemId,
      actorDid: args.actorDid,
      subOrgId: args.subOrgId,
    });

    console.log(
      `[credentialSigning] Signed ${args.type} credential for item ${args.itemId}`
    );

    return result;
  },
});
