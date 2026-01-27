"use node";

/**
 * Server-side DID creation using Turnkey and OriginalsSDK.
 *
 * This "use node" action creates did:webvh identities during OTP verification,
 * replacing the client-side approach that required a Turnkey auth proxy session.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
  createTurnkeyClient,
  TurnkeyWebVHSigner,
} from "@originals/auth/server";
import { OriginalsSDK } from "@originals/sdk";

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

    // Create Turnkey client using server-side credentials
    const turnkeyClient = createTurnkeyClient();

    // Get wallets first, then fetch accounts for the first wallet
    const walletsResponse = await turnkeyClient.apiClient().getWallets({
      organizationId: args.subOrgId,
    });
    const wallets = walletsResponse.wallets;
    if (!wallets || wallets.length === 0) {
      throw new Error("No wallets found for sub-org");
    }

    // Access the underlying @turnkey/http client to call getWalletAccounts
    // (TurnkeyHttpClient.apiClient() doesn't expose this method yet)
    const rawClient = (turnkeyClient as unknown as { client: { getWalletAccounts: (params: { organizationId: string; walletId: string }) => Promise<{ accounts: Array<{ address: string; curve: string; path: string; addressFormat: string }> }> } }).client;
    const accountsResponse = await rawClient.getWalletAccounts({
      organizationId: args.subOrgId,
      walletId: wallets[0].walletId,
    });
    const accounts = accountsResponse.accounts;
    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet accounts found for sub-org");
    }

    // Find the first Ed25519 account (Solana address = base58 public key)
    const ed25519Account = accounts.find(
      (a) => a.curve === "CURVE_ED25519"
    );
    if (!ed25519Account) {
      throw new Error("No Ed25519 account found in wallet");
    }

    const address = ed25519Account.address;
    // Verification method ID matches client-side convention
    const verificationMethodId = `did:key:${address}`;

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
