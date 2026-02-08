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

function toUserSlug(email: string, subOrgId: string) {
  const emailPart = email
    .replace(/[@.]/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
  return `user-${emailPart}-${subOrgId.slice(0, 8)}`;
}

export async function createUserWebVHDid(params: {
  email: string;
  subOrgId: string;
  domain?: string;
}) {
  const { privateKey, publicKeyMultibase } = await getOrCreateKeyPair(params.subOrgId);
  const signer = new BrowserWebVHSigner(privateKey, publicKeyMultibase);
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
