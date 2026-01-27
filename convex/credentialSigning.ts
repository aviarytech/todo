"use node";

/**
 * Server-side credential signing using Turnkey and OriginalsSDK.
 *
 * This "use node" action signs verifiable credentials for item actions
 * (add, check, uncheck, remove) using the user's Turnkey-managed keys.
 * Replaces the client-side signItemActionWithSigner approach.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  createTurnkeyClient,
  TurnkeyWebVHSigner,
} from "@originals/auth/server";
import { CredentialManager } from "@originals/sdk";
import type { OriginalsConfig } from "@originals/sdk";

// SDK configuration matching src/lib/originals.ts
const config: OriginalsConfig = {
  network: "signet",
  defaultKeyType: "Ed25519",
};

/**
 * Sign an item action as a verifiable credential using server-side Turnkey keys.
 *
 * Follows the same Turnkey client + wallet account lookup pattern from didCreation.ts.
 * The credential is signed using TurnkeyWebVHSigner and CredentialManager.
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
    const rawClient = (
      turnkeyClient as unknown as {
        client: {
          getWalletAccounts: (params: {
            organizationId: string;
            walletId: string;
          }) => Promise<{
            accounts: Array<{
              address: string;
              curve: string;
              path: string;
              addressFormat: string;
            }>;
          }>;
        };
      }
    ).client;
    const accountsResponse = await rawClient.getWalletAccounts({
      organizationId: args.subOrgId,
      walletId: wallets[0].walletId,
    });
    const accounts = accountsResponse.accounts;
    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet accounts found for sub-org");
    }

    // Find the first Ed25519 account (Solana address = base58 public key)
    const ed25519Account = accounts.find((a) => a.curve === "CURVE_ED25519");
    if (!ed25519Account) {
      throw new Error("No Ed25519 account found in wallet");
    }

    const address = ed25519Account.address;
    // Verification method ID matches convention from didCreation.ts
    const verificationMethodId = `did:key:${address}`;

    // Create server-side signer (same pattern as didCreation.ts)
    const signer = new TurnkeyWebVHSigner(
      args.subOrgId,
      address, // keyId = address for signWith
      address, // publicKeyMultibase
      turnkeyClient,
      verificationMethodId
    );

    // Create unsigned credential (matches src/lib/originals.ts signItemActionWithSigner)
    const credentialManager = new CredentialManager(config);
    const timestamp = new Date().toISOString();

    const unsignedCredential = await credentialManager.createResourceCredential(
      args.type === "ItemAdded" ? "ResourceCreated" : "ResourceUpdated",
      {
        id: `${args.listDid}#item-${args.itemId}`,
        actionType: args.type,
        listDid: args.listDid,
        itemId: args.itemId,
        actor: args.actorDid,
        timestamp,
      },
      args.actorDid
    );

    // Sign using TurnkeyWebVHSigner (external signer pattern)
    const signedCredential =
      await credentialManager.signCredentialWithExternalSigner(
        unsignedCredential,
        signer
      );

    console.log(
      `[credentialSigning] Signed ${args.type} credential for item ${args.itemId}`
    );

    return {
      type: args.type,
      listDid: args.listDid,
      itemId: args.itemId,
      actor: args.actorDid,
      timestamp,
      credential: signedCredential,
    };
  },
});
