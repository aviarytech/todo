/**
 * Originals SDK wrapper for the Lisa app.
 *
 * Provides a simplified API for:
 * - Asset creation (for lists with did:cel DIDs)
 * - Verifying a persisted asset envelope
 *
 * Note: Credential signing is now handled server-side via Convex actions.
 */

import { OriginalsSDK } from "@originals/sdk";
import type {
  AssetResource,
  DIDDocument,
  VerifiableCredential,
  KeyPair,
  OriginalsConfig,
} from "@originals/sdk";
import { localCelKeyStore } from "./celKeyStore";

// SDK configuration for testnet/development
const config: OriginalsConfig = {
  network: "signet", // Use signet for development
  defaultKeyType: "Ed25519",
  // Retains each asset's genesis controller key; without it the SDK drops the
  // key after signing genesis and later CEL appends degrade. See celKeyStore.ts.
  keyStore: localCelKeyStore,
};

export interface ListAsset {
  assetDid: string;
  name: string;
  createdBy: string;
  createdAt: string;
  /** Serialized AssetEnvelope — the CEL log is the asset's provenance. */
  envelope: string;
}

/** Lowercase hex SHA-256 — content-addresses the genesis resource. */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build the genesis resource for a list. did:cel genesis requires at least one
 * content-addressed resource, so the list's own metadata is that resource.
 */
export async function buildListResource(
  name: string,
  creatorDid: string,
  createdAt: string
): Promise<AssetResource> {
  const content = JSON.stringify({ name, createdBy: creatorDid, createdAt });
  return {
    id: "list-metadata",
    type: "ListMetadata",
    contentType: "application/json",
    content,
    hash: await sha256Hex(content),
  };
}

/**
 * Creates a new list asset.
 * Each list is represented as a did:cel asset. Genesis is local — it mints a
 * keypair and builds the event log in-process, with no network round-trip — so
 * list creation stays instant and works offline.
 *
 * Returns the serialized envelope alongside the DID. Persist it: the DID alone
 * is an opaque identifier, while the envelope carries the signed event log that
 * makes the asset verifiable.
 *
 * @param name - The name of the list
 * @param creatorDid - The DID of the user creating the list
 * @returns Promise<ListAsset> The created list asset
 */
export async function createListAsset(name: string, creatorDid: string): Promise<ListAsset> {
  const sdk = OriginalsSDK.create(config);
  const createdAt = new Date().toISOString();

  const asset = await sdk.lifecycle.createAsset([
    await buildListResource(name, creatorDid, createdAt),
  ]);

  return {
    assetDid: asset.id,
    name,
    createdBy: creatorDid,
    createdAt,
    envelope: JSON.stringify(asset.serialize()),
  };
}

export interface EnvelopeVerification {
  verified: boolean;
  assetDid?: string;
  warnings: string[];
  error?: string;
}

/**
 * Verify a persisted envelope: replays the signed CEL log, re-checks the
 * resource↔genesis binding and inline content hashes. Fails closed — any
 * tampering surfaces as verified:false rather than throwing at the call site.
 */
export async function verifyListEnvelope(envelope: string): Promise<EnvelopeVerification> {
  const sdk = OriginalsSDK.create(config);
  try {
    const { asset, verification, warnings } = await sdk.lifecycle.loadAsset(envelope);
    return {
      // loadAsset only returns absent `verification` when verification is skipped,
      // which we never request — treat a missing result as unverified, not as pass.
      verified: verification?.verified === true,
      assetDid: asset.id,
      warnings,
    };
  } catch (err) {
    return {
      verified: false,
      warnings: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Re-export types that consumers might need
export type { DIDDocument, VerifiableCredential, KeyPair };
