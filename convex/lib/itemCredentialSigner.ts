"use node";

/**
 * Turnkey-based credential signer for item VCs.
 *
 * Implements the ExternalSigner interface from @originals/sdk for
 * signing ItemCreated and ItemCompleted credentials.
 */

import {
  MultibaseEncoding,
  multibaseEncode,
} from "didwebvh-ts";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes } from "@noble/hashes/utils.js";
import { sha512 } from "@noble/hashes/sha2.js";
import * as ed25519 from "@noble/ed25519";

type TurnkeyClientLike = {
  apiClient: () => {
    signRawPayload: (params: {
      organizationId: string;
      signWith: string;
      payload: string;
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL";
      hashFunction: "HASH_FUNCTION_NO_OP";
    }) => Promise<{
      activity?: {
        result?: {
          signRawPayloadResult?: { r?: string; s?: string };
        };
      };
    }>;
  };
};

// Configure @noble/ed25519 with required SHA-512 function.
const sha512Fn = (...msgs: Uint8Array[]) => sha512(concatBytes(...msgs));

function configureEd25519Sha512() {
  const ed25519Module = ed25519 as unknown as {
    utils?: { sha512Sync?: (...msgs: Uint8Array[]) => Uint8Array };
    etc?: { sha512Sync?: (...msgs: Uint8Array[]) => Uint8Array };
  };
  if (ed25519Module.utils) {
    ed25519Module.utils.sha512Sync = sha512Fn;
  }
  if (ed25519Module.etc) {
    ed25519Module.etc.sha512Sync = sha512Fn;
  }
}

try {
  configureEd25519Sha512();
} catch (error) {
  console.warn("Failed to configure ed25519 utils:", error);
}

/**
 * Canonicalize a document for signing (simple JSON canonicalization).
 * Uses deterministic JSON serialization.
 */
function canonicalizeForSigning(doc: Record<string, unknown>): string {
  // Simple canonical form: sort keys, no whitespace
  const sortKeys = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  };
  return JSON.stringify(sortKeys(doc));
}

/**
 * Prepare data for signing according to Data Integrity spec.
 * Creates hash of concatenated proof options and document.
 */
async function prepareCredentialForSigning(
  document: Record<string, unknown>,
  proof: Record<string, unknown>
): Promise<Uint8Array> {
  // Remove proofValue from proof options before hashing
  const proofOptions = { ...proof };
  delete proofOptions.proofValue;

  // Canonicalize and hash both
  const proofCanon = canonicalizeForSigning(proofOptions);
  const docCanon = canonicalizeForSigning(document);

  const proofHash = sha256(new TextEncoder().encode(proofCanon));
  const docHash = sha256(new TextEncoder().encode(docCanon));

  // Concatenate hashes
  return concatBytes(proofHash, docHash);
}

/**
 * Turnkey-based ExternalSigner for VC credentials.
 */
export class TurnkeyCredentialSigner {
  private subOrgId: string;
  private keyId: string;
  private turnkeyClient: TurnkeyClientLike;
  private verificationMethodId: string;

  constructor(
    subOrgId: string,
    keyId: string,
    turnkeyClient: TurnkeyClientLike,
    verificationMethodId: string
  ) {
    this.subOrgId = subOrgId;
    this.keyId = keyId;
    this.turnkeyClient = turnkeyClient;
    this.verificationMethodId = verificationMethodId;
  }

  /**
   * Sign credential data using Turnkey's API.
   * Implements the ExternalSigner interface from @originals/sdk.
   */
  async sign(input: {
    document: Record<string, unknown>;
    proof: Record<string, unknown>;
  }): Promise<{ proofValue: string }> {
    try {
      const dataToSign = await prepareCredentialForSigning(
        input.document,
        input.proof
      );
      const dataHex = `0x${bytesToHex(dataToSign)}`;

      const result = await this.turnkeyClient.apiClient().signRawPayload({
        organizationId: this.subOrgId,
        signWith: this.keyId,
        payload: dataHex,
        encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
        hashFunction: "HASH_FUNCTION_NO_OP",
      });

      const signRawResult = result.activity?.result?.signRawPayloadResult;
      if (!signRawResult?.r || !signRawResult?.s) {
        throw new Error("No signature returned from Turnkey");
      }

      const signature = signRawResult.r + signRawResult.s;
      const cleanSig = signature.startsWith("0x")
        ? signature.slice(2)
        : signature;
      let signatureBytes = Buffer.from(cleanSig, "hex");

      if (signatureBytes.length === 65) {
        signatureBytes = signatureBytes.slice(0, 64);
      } else if (signatureBytes.length !== 64) {
        throw new Error(
          `Invalid Ed25519 signature length: ${signatureBytes.length} (expected 64 bytes)`
        );
      }

      const proofValue = multibaseEncode(
        signatureBytes,
        MultibaseEncoding.BASE58_BTC
      );
      return { proofValue };
    } catch (error) {
      console.error("Error signing credential with Turnkey:", error);
      throw new Error(
        `Failed to sign credential with Turnkey: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  getVerificationMethodId(): string {
    return this.verificationMethodId;
  }
}
