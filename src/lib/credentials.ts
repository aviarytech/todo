/**
 * Verifiable Credential helpers for list provenance.
 *
 * Creates simple VCs for list lifecycle events:
 * - ListPublished: when a list is shared publicly
 * - ItemCreated: when an item is added (by human or agent)
 * - ItemCompleted: when an item is checked off
 *
 * These are unsigned for now (no proof field) — signing will be added
 * when we integrate with the user's did:webvh key.
 */

export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: Record<string, unknown>;
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofValue: string;
  };
}

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
