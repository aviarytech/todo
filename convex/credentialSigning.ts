"use node";

/**
 * Server-side credential signing using Turnkey and OriginalsSDK.
 *
 * This "use node" action signs verifiable credentials for item actions
 * (add, check, uncheck, remove) using the user's Turnkey-managed keys.
 * Replaces the client-side signItemActionWithSigner approach.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { TurnkeyWebVHSigner } from "./lib/turnkeySigner";
import { getEd25519Account } from "./turnkeyHelpers";

interface UnsignedCredential {
  "@context": string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: Record<string, unknown>;
}

function createResourceCredential(
  type: "ResourceCreated" | "ResourceUpdated",
  subject: Record<string, unknown>,
  issuer: string
): UnsignedCredential {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", type],
    issuer,
    issuanceDate: new Date().toISOString(),
    credentialSubject: subject,
  };
}

async function signCredentialWithExternalSigner(
  credential: UnsignedCredential,
  signer: TurnkeyWebVHSigner
) {
  const proofBase = {
    type: "DataIntegrityProof",
    cryptosuite: "eddsa-jcs-2022",
    created: new Date().toISOString(),
    verificationMethod: signer.getVerificationMethodId(),
    proofPurpose: "assertionMethod",
  };

  const { proofValue } = await signer.sign({
    document: credential,
    proof: proofBase,
  });

  return {
    ...credential,
    proof: {
      ...proofBase,
      proofValue,
    },
  };
}

/**
 * Sign an item action as a verifiable credential using server-side Turnkey keys.
 *
 * Follows the same Turnkey client + wallet account lookup pattern from didCreation.ts.
 * The credential is signed using TurnkeyWebVHSigner and CredentialManager.
 */
export const signItemAction = action({
  args: {
    type: v.union(
      v.literal("ItemAdded"),
      v.literal("ItemChecked"),
      v.literal("ItemUnchecked"),
      v.literal("ItemRemoved")
    ),
    listDid: v.string(),
    itemId: v.string(),
    actorDid: v.string(),
    subOrgId: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log(
      `[credentialSigning] Signing ${args.type} credential for item ${args.itemId} (actor: ${args.actorDid})`
    );

    const { turnkeyClient, address, verificationMethodId } =
      await getEd25519Account(args.subOrgId);

    // Create server-side signer (same pattern as didCreation.ts)
    const signer = new TurnkeyWebVHSigner(
      args.subOrgId,
      address, // keyId = address for signWith
      address, // publicKeyMultibase
      turnkeyClient,
      verificationMethodId
    );

    // Create unsigned credential (matches src/lib/originals.ts shape)
    const timestamp = new Date().toISOString();

    const unsignedCredential = createResourceCredential(
      args.type === "ItemAdded" ? "ResourceCreated" : "ResourceUpdated",
      {
        id: `${args.listDid}#item-${args.itemId}`,
        actionType: args.type,
        listDid: args.listDid,
        itemId: args.itemId,
        actor: args.actorDid,
        timestamp,
      },
      args.actorDid
    );

    // Sign with Turnkey-backed external signer.
    const signedCredential = await signCredentialWithExternalSigner(
      unsignedCredential,
      signer
    );

    console.log(
      `[credentialSigning] Signed ${args.type} credential for item ${args.itemId}`
    );

    return {
      type: args.type,
      listDid: args.listDid,
      itemId: args.itemId,
      actor: args.actorDid,
      timestamp,
      credential: signedCredential,
    };
  },
});
