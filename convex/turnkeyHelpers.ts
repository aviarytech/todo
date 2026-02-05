"use node";

/**
 * Shared Turnkey wallet lookup helpers.
 *
 * Extracts the duplicated wallet-account resolution logic used by
 * credentialSigning.ts, didCreation.ts, and dataSigning.ts.
 */

import { createTurnkeyClient } from "./lib/turnkeyClient";

/** The shape returned by getWalletAccounts (not yet exposed by the wrapper). */
interface WalletAccount {
  address: string;
  curve: string;
  path: string;
  addressFormat: string;
}

/**
 * Look up the first Ed25519 wallet account for a Turnkey sub-org.
 *
 * Returns the Turnkey client, the Ed25519 account, and a convenience
 * `verificationMethodId` string (`did:key:<address>`).
 */
export async function getEd25519Account(subOrgId: string) {
  const turnkeyClient = createTurnkeyClient();

  // Get wallets for the sub-org
  const walletsResponse = await turnkeyClient.apiClient().getWallets({
    organizationId: subOrgId,
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
        }) => Promise<{ accounts: WalletAccount[] }>;
      };
    }
  ).client;
  const accountsResponse = await rawClient.getWalletAccounts({
    organizationId: subOrgId,
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
  const verificationMethodId = `did:key:${address}`;

  return { turnkeyClient, address, verificationMethodId };
}
