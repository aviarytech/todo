import { createDID, MultibaseEncoding, multibaseEncode, prepareDataForSigning } from "didwebvh-ts";
import { getPublicKeyAsync, signAsync, utils, verifyAsync } from "@noble/ed25519";
import { Capacitor } from '@capacitor/core';

const KEY_STORAGE_PREFIX = "lisa-webvh-ed25519";
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

class BrowserWebVHSigner {
  private readonly privateKey: Uint8Array;
  private readonly publicKeyMultibase: string;

  constructor(privateKey: Uint8Array, publicKeyMultibase: string) {
    this.privateKey = privateKey;
    this.publicKeyMultibase = publicKeyMultibase;
  }

  async sign(input: {
    document: unknown;
    proof: Record<string, unknown>;
  }): Promise<{ proofValue: string }> {
    const payload = await prepareDataForSigning(
      input.document as Record<string, unknown>,
      input.proof
    );
    const signature = await signAsync(payload, this.privateKey);
    return {
      proofValue: multibaseEncode(signature, MultibaseEncoding.BASE58_BTC),
    };
  }

  async verify(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    const key = publicKey.length === 33 ? publicKey.slice(1) : publicKey;
    return verifyAsync(signature, message, key);
  }

  getVerificationMethodId() {
    return `did:key:${this.publicKeyMultibase}`;
  }
}

async function getOrCreateKeyPair(subOrgId: string) {
  const storageKey = `${KEY_STORAGE_PREFIX}:${subOrgId}`;
  // TODO: Migrate to async storageAdapter for native support (see storageAdapter.ts)
  // This would provide better security on native platforms via Capacitor Preferences
  const existingPrivateKey = localStorage.getItem(storageKey);
  const privateKey = existingPrivateKey
    ? hexToBytes(existingPrivateKey)
    : utils.randomPrivateKey();

  if (!existingPrivateKey) {
    localStorage.setItem(storageKey, bytesToHex(privateKey));
  }

  const publicKey = await getPublicKeyAsync(privateKey);
  const multikeyBytes = new Uint8Array(
    ED25519_MULTICODEC_PREFIX.length + publicKey.length
  );
  multikeyBytes.set(ED25519_MULTICODEC_PREFIX, 0);
  multikeyBytes.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
  const publicKeyMultibase = multibaseEncode(multikeyBytes, MultibaseEncoding.BASE58_BTC);
  return { privateKey, publicKeyMultibase };
}

function toUserSlug(_email: string, subOrgId: string) {
  // Use subOrgId only — no PII in the DID
  return `user-${subOrgId.slice(0, 16)}`;
}

export async function createUserWebVHDid(params: {
  email: string;
  subOrgId: string;
  domain?: string;
}) {
  const { privateKey, publicKeyMultibase } = await getOrCreateKeyPair(params.subOrgId);
  const signer = new BrowserWebVHSigner(privateKey, publicKeyMultibase);
  // In Capacitor native apps, window.location.host returns "localhost", so use production domain
  const host = Capacitor.isNativePlatform() ? 'trypoo.app' : window.location.host;
  const domain =
    params.domain || (import.meta.env.VITE_WEBVH_DOMAIN as string | undefined) || host;

  const result = await createDID({
    domain,
    signer,
    verifier: signer,
    updateKeys: [signer.getVerificationMethodId()],
    verificationMethods: [
      {
        id: "#key-0",
        type: "Multikey",
        controller: "",
        publicKeyMultibase,
      },
      {
        id: "#key-1",
        type: "Multikey",
        controller: "",
        publicKeyMultibase,
      },
    ],
    paths: [toUserSlug(params.email, params.subOrgId)],
    portable: false,
    authentication: ["#key-0"],
    assertionMethod: ["#key-1"],
  });

  return {
    did: result.did,
    didDocument: result.doc,
    didLog: result.log,
  };
}

/**
 * Extract the domain from a did:webvh string.
 * e.g. "did:webvh:trypoo.app:user-abc123" → "trypoo.app"
 */
export function domainFromDid(did: string): string {
  // did:webvh:<domain>:<path>
  const parts = did.split(":");
  if (parts.length < 3 || parts[1] !== "webvh") {
    throw new Error(`Cannot extract domain from DID: ${did}`);
  }
  return parts[2];
}

export async function createListWebVHDid(params: {
  subOrgId: string;
  userDid: string; // user's did:webvh — domain is derived from this
  slug: string;
}) {
  const domain = domainFromDid(params.userDid);
  const { privateKey, publicKeyMultibase } = await getOrCreateKeyPair(params.subOrgId);
  const signer = new BrowserWebVHSigner(privateKey, publicKeyMultibase);

  const result = await createDID({
    domain,
    signer,
    verifier: signer,
    updateKeys: [signer.getVerificationMethodId()],
    verificationMethods: [
      {
        id: "#key-0",
        type: "Multikey",
        controller: "",
        publicKeyMultibase,
      },
      {
        id: "#key-1",
        type: "Multikey",
        controller: "",
        publicKeyMultibase,
      },
    ],
    paths: [params.slug],
    portable: false,
    authentication: ["#key-0"],
    assertionMethod: ["#key-1"],
  });

  return {
    did: result.did,
    didDocument: result.doc,
    didLog: result.log,
  };
}
