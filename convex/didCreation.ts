"use node";

/**
 * Server-side DID creation using Turnkey and OriginalsSDK.
 *
 * This "use node" action creates did:webvh identities during OTP verification,
 * replacing the client-side approach that required a Turnkey auth proxy session.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { TurnkeyWebVHSigner } from "@originals/auth/server";
import { OriginalsSDK } from "@originals/sdk";
import { getEd25519Account } from "./turnkeyHelpers";

/**
 * Create a did:webvh DID for a user using their Turnkey sub-org wallet.
 *
 * Fetches the wallet accounts for the sub-org, finds the Ed25519 key,
 * and uses the OriginalsSDK to create a did:webvh identity.
 */
export const createDIDWebVH = internalAction({
  args: {
    subOrgId: v.string(),
    email: v.string(),
  },
  handler: async (_ctx, args): Promise<{ did: string }> => {
    const domain = process.env.WEBVH_DOMAIN;
    if (!domain) {
      throw new Error("WEBVH_DOMAIN environment variable is not set");
    }

    console.log(
      `[didCreation] Creating did:webvh for ${args.email} (subOrg: ${args.subOrgId})`
    );

    const { turnkeyClient, address, verificationMethodId } =
      await getEd25519Account(args.subOrgId);

    // Create URL-safe slug from email (matches client-side logic)
    const slug = `user-${args.email
      .replace(/[@.]/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase()}`;

    // Create server-side signer
    const signer = new TurnkeyWebVHSigner(
      args.subOrgId,
      address, // keyId = address for signWith
      address, // publicKeyMultibase (matches client-side convention)
      turnkeyClient,
      verificationMethodId
    );

    // Create DID using OriginalsSDK (matches client-side createDIDWithTurnkey)
    const result = await OriginalsSDK.createDIDOriginal({
      type: "did",
      domain,
      signer,
      verifier: signer,
      updateKeys: [verificationMethodId],
      verificationMethods: [
        {
          id: "#key-0",
          type: "Multikey",
          controller: "",
          publicKeyMultibase: address,
        },
        {
          id: "#key-1",
          type: "Multikey",
          controller: "",
          publicKeyMultibase: address,
        },
      ],
      paths: [slug],
      portable: false,
      authentication: ["#key-0"],
      assertionMethod: ["#key-1"],
    });

    console.log(`[didCreation] Created did:webvh: ${result.did}`);
    return { did: result.did };
  },
});
