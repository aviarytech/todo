/**
 * Identity storage utility for localStorage persistence.
 *
 * Wraps the Originals SDK identity with display name and localStorage
 * persistence. The identity includes the private key needed for signing
 * item actions.
 */

const STORAGE_KEY = "lisa-identity";

export interface StoredIdentity {
  did: string;           // did:peer:...
  displayName: string;
  privateKey: string;    // For signing item actions
  publicKey: string;
  createdAt: string;
}

/**
 * Load identity from localStorage.
 * Returns null if no identity exists.
 */
export function getIdentity(): StoredIdentity | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as StoredIdentity;
  } catch (error) {
    console.error("Failed to load identity from localStorage:", error);
    return null;
  }
}

/**
 * Save identity to localStorage.
 */
export function saveIdentity(identity: StoredIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch (error) {
    console.error("Failed to save identity to localStorage:", error);
    throw new Error("Failed to save identity");
  }
}

/**
 * Remove identity from localStorage.
 */
export function clearIdentity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear identity from localStorage:", error);
  }
}
