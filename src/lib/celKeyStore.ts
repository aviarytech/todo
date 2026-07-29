/**
 * localStorage-backed KeyStore for did:cel list assets.
 *
 * Without a KeyStore, LifecycleManager.createAsset mints the genesis controller
 * key, uses it to sign the create event, then drops it — the SDK emits
 * `key:unpersisted` and every later CEL append degrades to cel:append-skipped.
 * Holding the key is what makes a list asset authorable rather than merely
 * identifiable.
 *
 * Custody matches the did:webvh keys in webvh.ts: raw hex in localStorage,
 * per-origin, never sent to the server.
 */

import type { KeyStore } from "@originals/sdk";

const KEY_STORAGE_PREFIX = "lisa-cel-ed25519";

function storageKey(verificationMethodId: string): string {
  return `${KEY_STORAGE_PREFIX}:${verificationMethodId}`;
}

/**
 * The SDK registers each genesis key under two verification-method ids (the
 * did:key VM and `<did>#key-0`), so a single asset writes two entries.
 */
export const localCelKeyStore: KeyStore = {
  async getPrivateKey(verificationMethodId: string): Promise<string | null> {
    try {
      return localStorage.getItem(storageKey(verificationMethodId));
    } catch {
      return null; // private-mode / disabled storage: degrade to verify-only
    }
  },

  async setPrivateKey(verificationMethodId: string, privateKey: string): Promise<void> {
    try {
      localStorage.setItem(storageKey(verificationMethodId), privateKey);
    } catch {
      // Quota or disabled storage. The asset is still created and verifiable;
      // it just cannot author later CEL events from this device.
    }
  },
};

/** True when this device holds the signing key for a verification method. */
export async function hasCelKey(verificationMethodId: string): Promise<boolean> {
  return (await localCelKeyStore.getPrivateKey(verificationMethodId)) !== null;
}
