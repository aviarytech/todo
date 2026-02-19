/**
 * Verifiable Credential creation and signing for list provenance.
 *
 * Uses the same Ed25519 key pair as the user's did:webvh identity.
 * Signs with Data Integrity proofs (eddsa-jcs-2022 cryptosuite).
 *
 * Flow:
 *   1. Build unsigned VC (createListPublishedVC, etc.)
 *   2. Sign it (signCredential) using the user's Ed25519 key
 *   3. Store the signed VC in Convex
 *   4. Anyone can verify by resolving the issuer DID and checking the proof
 */

import { signAsync, verifyAsync, getPublicKeyAsync } from "@noble/ed25519";
import { multibaseEncode, MultibaseEncoding } from "didwebvh-ts";
import { getOrCreateKeyPair } from "./webvh";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataIntegrityProof {
  type: "DataIntegrityProof";
  cryptosuite: "eddsa-jcs-2022";
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod";
  proofValue: string;
}

export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: Record<string, unknown>;
  proof?: DataIntegrityProof;
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

/**
 * Canonicalize a JSON object using JCS (JSON Canonicalization Scheme — RFC 8785).
 * This is a simplified implementation that handles the common cases.
 * JCS sorts object keys and uses minimal JSON serialization.
 */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "boolean" || typeof obj === "number") return JSON.stringify(obj);
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalize).join(",") + "]";
  }
  if (typeof obj === "object") {
    const sorted = Object.keys(obj as Record<string, unknown>).sort();
    const entries = sorted
      .filter((k) => (obj as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalize((obj as Record<string, unknown>)[k])}`);
    return "{" + entries.join(",") + "}";
  }
  return String(obj);
}

/**
 * Hash a string with SHA-256 (browser-compatible).
 */
async function sha256(data: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hashBuffer);
}

/**
 * Sign a Verifiable Credential with the user's Ed25519 key.
 *
 * Creates a Data Integrity proof using the eddsa-jcs-2022 cryptosuite:
 *   1. Canonicalize the credential (without proof) using JCS
 *   2. Canonicalize the proof options
 *   3. SHA-256 hash both, concatenate
 *   4. Sign with Ed25519
 *   5. Encode signature as multibase (base58btc)
 *
 * @param credential - The unsigned VC
 * @param subOrgId - User's Turnkey sub-org ID (to access their key pair)
 * @returns The VC with a proof attached
 */
export async function signCredential(
  credential: VerifiableCredential,
  subOrgId: string
): Promise<VerifiableCredential> {
  const { privateKey, publicKeyMultibase } = await getOrCreateKeyPair(subOrgId);

  // Build proof options (everything except proofValue)
  const proofOptions = {
    type: "DataIntegrityProof" as const,
    cryptosuite: "eddsa-jcs-2022" as const,
    created: new Date().toISOString(),
    verificationMethod: `did:key:${publicKeyMultibase}`,
    proofPurpose: "assertionMethod" as const,
  };

  // Step 1: Canonicalize the document (without proof)
  const { proof: _existingProof, ...docWithoutProof } = credential;
  const canonicalDoc = canonicalize(docWithoutProof);

  // Step 2: Canonicalize the proof options
  const canonicalProof = canonicalize(proofOptions);

  // Step 3: Hash both and concatenate
  const docHash = await sha256(canonicalDoc);
  const proofHash = await sha256(canonicalProof);
  const combined = new Uint8Array(docHash.length + proofHash.length);
  combined.set(proofHash, 0); // proof hash first per spec
  combined.set(docHash, proofHash.length);

  // Step 4: Sign
  const signature = await signAsync(combined, privateKey);

  // Step 5: Encode as multibase
  const proofValue = multibaseEncode(signature, MultibaseEncoding.BASE58_BTC);

  return {
    ...credential,
    proof: {
      ...proofOptions,
      proofValue,
    },
  };
}

/**
 * Verify a signed Verifiable Credential.
 *
 * @param credential - The signed VC with proof
 * @returns true if the signature is valid
 */
export async function verifyCredential(
  credential: VerifiableCredential
): Promise<boolean> {
  if (!credential.proof) return false;

  const { proofValue, ...proofOptions } = credential.proof;

  // Extract public key from verification method (did:key:z...)
  const vmId = proofOptions.verificationMethod;
  if (!vmId.startsWith("did:key:")) return false;

  const publicKeyMultibase = vmId.slice("did:key:".length);

  // Decode multibase public key
  // The multibase is base58btc (z prefix) encoding of multicodec-prefixed key
  // We need the raw 32-byte public key
  const { multibaseDecode } = await import("didwebvh-ts");
  const multikeyBytes = multibaseDecode(publicKeyMultibase);

  // Strip ed25519 multicodec prefix (0xed01)
  const publicKey = multikeyBytes.slice(2);

  // Rebuild the signing input
  const { proof: _proof, ...docWithoutProof } = credential;
  const canonicalDoc = canonicalize(docWithoutProof);
  const canonicalProofOpts = canonicalize(proofOptions);

  const docHash = await sha256(canonicalDoc);
  const proofHash = await sha256(canonicalProofOpts);
  const combined = new Uint8Array(docHash.length + proofHash.length);
  combined.set(proofHash, 0);
  combined.set(docHash, proofHash.length);

  // Decode the signature from multibase
  const signature = multibaseDecode(proofValue);

  return verifyAsync(signature, combined, publicKey);
}

// ---------------------------------------------------------------------------
// VC Builders (unsigned — call signCredential after)
// ---------------------------------------------------------------------------

/**
 * Create a ListPublished VC — proves who published a list and when.
 */
export function createListPublishedVC(params: {
  issuerDid: string;
  listResourceDid: string;
  listName: string;
}): VerifiableCredential {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://trypoo.app/credentials/v1",
    ],
    type: ["VerifiableCredential", "ListPublished"],
    issuer: params.issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: params.listResourceDid,
      type: "PooList",
      name: params.listName,
      publisher: params.issuerDid,
      action: "published",
    },
  };
}

/**
 * Create an ItemCreated VC — proves who added an item.
 */
export function createItemCreatedVC(params: {
  issuerDid: string;
  listResourceDid: string;
  itemName: string;
}): VerifiableCredential {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://trypoo.app/credentials/v1",
    ],
    type: ["VerifiableCredential", "ItemCreated"],
    issuer: params.issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: params.listResourceDid,
      type: "PooListItem",
      name: params.itemName,
      creator: params.issuerDid,
      action: "created",
    },
  };
}

/**
 * Create an ItemCompleted VC — proves who checked off an item.
 */
export function createItemCompletedVC(params: {
  issuerDid: string;
  listResourceDid: string;
  itemName: string;
}): VerifiableCredential {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://trypoo.app/credentials/v1",
    ],
    type: ["VerifiableCredential", "ItemCompleted"],
    issuer: params.issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: params.listResourceDid,
      type: "PooListItem",
      name: params.itemName,
      completedBy: params.issuerDid,
      action: "completed",
    },
  };
}
