/**
 * Publication utilities for did:webvh list publishing.
 *
 * Phase 4: Provides client-side functions for creating did:webvh DIDs
 * for published lists using Turnkey signing.
 */

import type { TurnkeyClient, WalletAccount } from "@turnkey/core";
import { createDIDWithTurnkey } from "./turnkey";

/**
 * Parameters for publishing a list
 */
export interface PublishListParams {
  /** Convex list ID */
  listId: string;
  /** List name (for display) */
  listName: string;
  /** Turnkey client instance */
  turnkeyClient: TurnkeyClient;
  /** Wallet account with Ed25519 key for signing */
  walletAccount: WalletAccount;
  /** Public key in multibase format */
  publicKeyMultibase: string;
  /** Callback when session expires */
  onSessionExpired?: () => void;
}

/**
 * Result of publishing a list
 */
export interface PublishListResult {
  /** The did:webvh DID for the published list */
  did: string;
  /** The DID document JSON string */
  didDocument: string;
  /** The DID log JSON string for verification */
  didLog: string;
}

/**
 * Domain for publishing lists.
 * In production, this should be the app's domain.
 */
const PUBLICATION_DOMAIN = "lisa.aviary.tech";

/**
 * Create a did:webvh DID for a list.
 *
 * This creates a publicly-resolvable DID that identifies the list.
 * The DID can be used to discover and verify the list's contents.
 *
 * @param params - Publication parameters
 * @returns Promise with DID, document, and log
 */
export async function createListDID(
  params: PublishListParams
): Promise<PublishListResult> {
  const {
    listId,
    turnkeyClient,
    walletAccount,
    onSessionExpired,
  } = params;

  // The public key address is used for all key purposes
  // This simplifies the key management while still enabling verification
  const publicKeyAddress = walletAccount.address;

  // Create the DID slug from the list ID
  // Remove any special characters and ensure it's URL-safe
  const slug = `list-${listId.replace(/[^a-zA-Z0-9-]/g, "")}`;

  console.log(
    "[publication] Creating did:webvh for list",
    listId,
    "with slug:",
    slug
  );

  // Create the did:webvh using Turnkey signing
  const { did, didDocument, didLog } = await createDIDWithTurnkey({
    turnkeyClient,
    updateKeyAccount: walletAccount,
    authKeyPublic: publicKeyAddress,
    assertionKeyPublic: publicKeyAddress,
    updateKeyPublic: publicKeyAddress,
    domain: PUBLICATION_DOMAIN,
    slug,
    onExpired: onSessionExpired,
  });

  console.log("[publication] Created DID:", did);

  return {
    did,
    didDocument: JSON.stringify(didDocument),
    didLog: JSON.stringify(didLog),
  };
}

/**
 * Get the public URL for a published list.
 *
 * @param webvhDid - The did:webvh DID of the published list
 * @returns The public URL for viewing the list
 */
export function getPublicListUrl(webvhDid: string): string {
  // Extract the DID identifier (everything after did:webvh:)
  const didId = webvhDid.replace("did:webvh:", "");
  // URL encode in case of special characters
  const encodedId = encodeURIComponent(didId);
  return `${window.location.origin}/public/${encodedId}`;
}

/**
 * Extract the DID from a public list URL.
 *
 * @param url - The public list URL
 * @returns The did:webvh DID, or null if invalid URL
 */
export function getDIDFromPublicUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/^\/public\/(.+)$/);
    if (!match) return null;
    const didId = decodeURIComponent(match[1]);
    return `did:webvh:${didId}`;
  } catch {
    return null;
  }
}
