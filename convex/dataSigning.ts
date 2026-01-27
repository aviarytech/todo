"use node";

/**
 * Server-side arbitrary data signing using Turnkey.
 *
 * General-purpose signing endpoint — NOT credential-specific.
 * Takes raw data (string), signs it with the user's Turnkey-managed
 * Ed25519 key, and returns the signature + public key.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getEd25519Account } from "./turnkeyHelpers";

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

    const { turnkeyClient, address } = await getEd25519Account(args.subOrgId);

    // Encode the data as hex for Turnkey's signRawPayload
    const payloadHex = Buffer.from(args.data, "utf-8").toString("hex");

    const result = await turnkeyClient.apiClient().signRawPayload({
      organizationId: args.subOrgId,
      signWith: address,
      payload: `0x${payloadHex}`,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NO_OP",
    });

    const signResult = result.activity?.result?.signRawPayloadResult;
    if (!signResult?.r || !signResult?.s) {
      throw new Error("No signature returned from Turnkey");
    }

    // Concatenate r and s to form the Ed25519 signature (64 bytes)
    const signature = signResult.r + signResult.s;

    console.log(
      `[dataSigning] Signed data successfully (pubkey: ${address})`
    );

    return {
      signature,
      publicKey: address,
    };
  },
});
