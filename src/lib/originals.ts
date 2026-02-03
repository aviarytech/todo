/**
 * Originals SDK wrapper for the Lisa app.
 *
 * Provides a simplified API for:
 * - Asset creation (for lists with did:peer DIDs)
 *
 * Note: Credential signing is now handled server-side via Convex actions.
 */

import { DIDManager } from "@originals/sdk";
import type { DIDDocument, VerifiableCredential, KeyPair, OriginalsConfig } from "@originals/sdk";

// SDK configuration for testnet/development
const config: OriginalsConfig = {
  network: "signet", // Use signet for development
  defaultKeyType: "Ed25519",
};

export interface ListAsset {
  assetDid: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Creates a new list asset.
 * Each list is represented as a did:peer asset.
 *
 * @param name - The name of the list
 * @param creatorDid - The DID of the user creating the list
 * @returns Promise<ListAsset> The created list asset
 */
export async function createListAsset(name: string, creatorDid: string): Promise<ListAsset> {
  const didManager = new DIDManager(config);

  // Create a did:peer for the list asset (no embedded resources for v1 simplicity)
  const result = await didManager.createDIDPeer([], true);

  return {
    assetDid: result.didDocument.id,
    name,
    createdBy: creatorDid,
    createdAt: new Date().toISOString(),
  };
}

// Re-export types that consumers might need
export type { DIDDocument, VerifiableCredential, KeyPair };
