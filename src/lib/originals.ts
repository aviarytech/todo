/**
 * Originals SDK wrapper for the Lisa app.
 *
 * Provides a simplified API for:
 * - Identity creation (DID generation)
 * - Asset creation (for lists)
 * - Credential signing (for item actions)
 *
 * The SDK uses did:peer DIDs for local-first identity which can later
 * be migrated to did:webvh or did:btco for publication.
 */

import { DIDManager, CredentialManager } from "@originals/sdk";
import type { DIDDocument, VerifiableCredential, KeyPair, OriginalsConfig } from "@originals/sdk";

// SDK configuration for testnet/development
const config: OriginalsConfig = {
  network: "signet", // Use signet for development
  defaultKeyType: "Ed25519",
};

export interface Identity {
  did: string;
  privateKey: string;
  publicKey: string;
  didDocument: DIDDocument;
}

/**
 * Creates a new decentralized identity (DID).
 * Generates a did:peer DID with an Ed25519 key pair.
 *
 * @returns Promise<Identity> The generated identity with DID and keys
 */
export async function createIdentity(): Promise<Identity> {
  const didManager = new DIDManager(config);

  // Create a DID document with a new key pair
  const result = await didManager.createDIDPeer([], true);

  return {
    did: result.didDocument.id,
    privateKey: result.keyPair.privateKey,
    publicKey: result.keyPair.publicKey,
    didDocument: result.didDocument,
  };
}

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

export type ItemActionType = "ItemAdded" | "ItemChecked" | "ItemUnchecked" | "ItemRemoved";

export interface ItemActionCredential {
  type: ItemActionType;
  listDid: string;
  itemId: string;
  actor: string;
  timestamp: string;
  credential: VerifiableCredential;
}

/**
 * Signs an item action as a verifiable credential.
 *
 * For v1, credentials are generated for provenance tracking but full
 * verification is best-effort. This creates an audit trail for each
 * item action (add, check, remove).
 *
 * @param type - The type of action
 * @param listDid - The DID of the list asset
 * @param itemId - The ID of the item
 * @param actorDid - The DID of the user performing the action
 * @param privateKey - The actor's private key for signing
 * @returns Promise<ItemActionCredential> The signed credential
 */
export async function signItemAction(
  type: ItemActionType,
  listDid: string,
  itemId: string,
  actorDid: string,
  privateKey: string
): Promise<ItemActionCredential> {
  const credentialManager = new CredentialManager(config);
  const timestamp = new Date().toISOString();

  // Create an unsigned credential
  const unsignedCredential = await credentialManager.createResourceCredential(
    type === "ItemAdded" ? "ResourceCreated" : "ResourceUpdated",
    {
      id: `${listDid}#item-${itemId}`,
      actionType: type,
      listDid,
      itemId,
      actor: actorDid,
      timestamp,
    },
    actorDid
  );

  // Sign the credential
  // Note: The verification method ID follows the DID + key fragment pattern
  const verificationMethodId = `${actorDid}#key-1`;
  const signedCredential = await credentialManager.signCredential(
    unsignedCredential,
    privateKey,
    verificationMethodId
  );

  return {
    type,
    listDid,
    itemId,
    actor: actorDid,
    timestamp,
    credential: signedCredential,
  };
}

/**
 * Verifies an item action credential.
 * Best-effort verification for v1.
 *
 * @param credential - The credential to verify
 * @returns Promise<boolean> Whether the credential is valid
 */
export async function verifyItemAction(credential: VerifiableCredential): Promise<boolean> {
  try {
    const credentialManager = new CredentialManager(config);
    return await credentialManager.verifyCredential(credential);
  } catch {
    // Best-effort verification for v1
    console.warn("Credential verification failed, continuing with best-effort mode");
    return false;
  }
}

/**
 * External signer interface compatible with TurnkeyDIDSigner.
 * Matches the ExternalSigner interface from @originals/sdk.
 */
export interface ExternalSigner {
  sign(input: {
    document: Record<string, unknown>;
    proof: Record<string, unknown>;
  }): Promise<{ proofValue: string }>;
  getVerificationMethodId(): string;
}

/**
 * Signs an item action using an external signer (e.g., TurnkeyDIDSigner).
 *
 * This is the Turnkey-based equivalent of signItemAction, using the
 * external signer for secure key operations instead of a raw private key.
 *
 * @param type - The type of action
 * @param listDid - The DID of the list asset
 * @param itemId - The ID of the item
 * @param actorDid - The DID of the user performing the action
 * @param signer - The external signer instance (e.g., TurnkeyDIDSigner)
 * @returns Promise<ItemActionCredential> The signed credential
 */
export async function signItemActionWithSigner(
  type: ItemActionType,
  listDid: string,
  itemId: string,
  actorDid: string,
  signer: ExternalSigner
): Promise<ItemActionCredential> {
  const credentialManager = new CredentialManager(config);
  const timestamp = new Date().toISOString();

  // Create an unsigned credential
  const unsignedCredential = await credentialManager.createResourceCredential(
    type === "ItemAdded" ? "ResourceCreated" : "ResourceUpdated",
    {
      id: `${listDid}#item-${itemId}`,
      actionType: type,
      listDid,
      itemId,
      actor: actorDid,
      timestamp,
    },
    actorDid
  );

  // Sign the credential using the external signer
  const signedCredential = await credentialManager.signCredentialWithExternalSigner(
    unsignedCredential,
    signer
  );

  return {
    type,
    listDid,
    itemId,
    actor: actorDid,
    timestamp,
    credential: signedCredential,
  };
}

// Re-export types that consumers might need
export type { DIDDocument, VerifiableCredential, KeyPair };
