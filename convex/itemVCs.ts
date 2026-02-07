"use node";

/**
 * Server-side VC issuance for item authorship and completion proofs.
 *
 * Uses @originals/sdk CredentialManager to issue verifiable credentials
 * when items are created or completed.
 */

import {
  action,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  CredentialManager,
  type VerifiableCredential,
  type OriginalsConfig,
} from "@originals/sdk";
import { TurnkeyCredentialSigner } from "./lib/itemCredentialSigner";
import { getEd25519Account } from "./turnkeyHelpers";

// SDK configuration
const sdkConfig: OriginalsConfig = {
  network: "signet",
  defaultKeyType: "Ed25519",
};

/**
 * Custom credential subject for ItemCreated
 */
interface ItemCreatedSubject {
  id: string;
  itemId: string;
  listId: string;
  itemName: string;
  creatorDid: string;
  createdAt: string;
}

/**
 * Custom credential subject for ItemCompleted
 */
interface ItemCompletedSubject {
  id: string;
  itemId: string;
  listId: string;
  itemName: string;
  completerDid: string;
  completedAt: string;
}

/**
 * Create an unsigned ItemCreated credential.
 */
function createItemCreatedCredential(
  issuerDid: string,
  subject: ItemCreatedSubject
): VerifiableCredential {
  const credentialManager = new CredentialManager(sdkConfig);
  return credentialManager.createResourceCredential(
    "ItemCreated" as "ResourceCreated",
    subject,
    issuerDid
  );
}

/**
 * Create an unsigned ItemCompleted credential.
 */
function createItemCompletedCredential(
  issuerDid: string,
  subject: ItemCompletedSubject
): VerifiableCredential {
  const credentialManager = new CredentialManager(sdkConfig);
  return credentialManager.createResourceCredential(
    "ItemCompleted" as "ResourceUpdated",
    subject,
    issuerDid
  );
}

/**
 * Internal mutation to add a VC proof to an item.
 * Exported for use by internal actions.
 */
export const addVCProof = internalMutation({
  args: {
    itemId: v.id("items"),
    proof: v.object({
      type: v.union(v.literal("ItemCreated"), v.literal("ItemCompleted")),
      credential: v.string(),
      issuedAt: v.number(),
      issuerDid: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    const existingProofs = item.vcProofs ?? [];
    await ctx.db.patch(args.itemId, {
      vcProofs: [...existingProofs, args.proof],
    });
  },
});

/**
 * Core VC issuance logic for ItemCreated.
 * Can be called from actions.
 */
async function issueItemCreatedVCCore(args: {
  itemId: Id<"items">;
  listId: Id<"lists">;
  itemName: string;
  creatorDid: string;
  creatorSubOrgId: string;
  createdAt: number;
}): Promise<{ signedCredential: VerifiableCredential }> {
  console.log(`[itemVCs] Issuing ItemCreated VC for item ${args.itemId}`);

  // Get Turnkey account for signing
  const {
    turnkeyClient,
    address,
    verificationMethodId,
    signingOrganizationId,
  } = await getEd25519Account(args.creatorSubOrgId);

  // Create signer
  const signer = new TurnkeyCredentialSigner(
    signingOrganizationId,
    address,
    turnkeyClient,
    verificationMethodId
  );

  // Create credential subject
  const subject: ItemCreatedSubject = {
    id: args.creatorDid,
    itemId: args.itemId as string,
    listId: args.listId as string,
    itemName: args.itemName,
    creatorDid: args.creatorDid,
    createdAt: new Date(args.createdAt).toISOString(),
  };

  // Create unsigned credential
  const unsignedCredential = createItemCreatedCredential(
    args.creatorDid,
    subject
  );

  // Sign with Turnkey
  const credentialManager = new CredentialManager(sdkConfig);
  const signedCredential =
    await credentialManager.signCredentialWithExternalSigner(
      unsignedCredential,
      signer
    );

  console.log(`[itemVCs] Signed ItemCreated VC for item ${args.itemId}`);
  return { signedCredential };
}

/**
 * Core VC issuance logic for ItemCompleted.
 * Can be called from actions.
 */
async function issueItemCompletedVCCore(args: {
  itemId: Id<"items">;
  listId: Id<"lists">;
  itemName: string;
  completerDid: string;
  completerSubOrgId: string;
  completedAt: number;
}): Promise<{ signedCredential: VerifiableCredential }> {
  console.log(`[itemVCs] Issuing ItemCompleted VC for item ${args.itemId}`);

  // Get Turnkey account for signing
  const {
    turnkeyClient,
    address,
    verificationMethodId,
    signingOrganizationId,
  } = await getEd25519Account(args.completerSubOrgId);

  // Create signer
  const signer = new TurnkeyCredentialSigner(
    signingOrganizationId,
    address,
    turnkeyClient,
    verificationMethodId
  );

  // Create credential subject
  const subject: ItemCompletedSubject = {
    id: args.completerDid,
    itemId: args.itemId as string,
    listId: args.listId as string,
    itemName: args.itemName,
    completerDid: args.completerDid,
    completedAt: new Date(args.completedAt).toISOString(),
  };

  // Create unsigned credential
  const unsignedCredential = createItemCompletedCredential(
    args.completerDid,
    subject
  );

  // Sign with Turnkey
  const credentialManager = new CredentialManager(sdkConfig);
  const signedCredential =
    await credentialManager.signCredentialWithExternalSigner(
      unsignedCredential,
      signer
    );

  console.log(`[itemVCs] Signed ItemCompleted VC for item ${args.itemId}`);
  return { signedCredential };
}

/**
 * Issue an ItemCreated VC for a newly created item.
 * Internal action - called after item creation.
 */
export const issueItemCreatedVC = internalAction({
  args: {
    itemId: v.id("items"),
    listId: v.id("lists"),
    itemName: v.string(),
    creatorDid: v.string(),
    creatorSubOrgId: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      const { signedCredential } = await issueItemCreatedVCCore(args);

      // Store the VC proof using dynamic import to avoid type generation issues
      const { internal } = await import("./_generated/api");
      await ctx.runMutation(internal.itemVCs.addVCProof, {
        itemId: args.itemId,
        proof: {
          type: "ItemCreated" as const,
          credential: JSON.stringify(signedCredential),
          issuedAt: Date.now(),
          issuerDid: args.creatorDid,
        },
      });

      console.log(`[itemVCs] Stored ItemCreated VC for item ${args.itemId}`);
      return { success: true };
    } catch (error) {
      console.error(`[itemVCs] Error issuing ItemCreated VC:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Issue an ItemCompleted VC when an item is checked.
 * Internal action - called after item completion.
 */
export const issueItemCompletedVC = internalAction({
  args: {
    itemId: v.id("items"),
    listId: v.id("lists"),
    itemName: v.string(),
    completerDid: v.string(),
    completerSubOrgId: v.string(),
    completedAt: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      const { signedCredential } = await issueItemCompletedVCCore(args);

      // Store the VC proof using dynamic import to avoid type generation issues
      const { internal } = await import("./_generated/api");
      await ctx.runMutation(internal.itemVCs.addVCProof, {
        itemId: args.itemId,
        proof: {
          type: "ItemCompleted" as const,
          credential: JSON.stringify(signedCredential),
          issuedAt: Date.now(),
          issuerDid: args.completerDid,
        },
      });

      console.log(`[itemVCs] Stored ItemCompleted VC for item ${args.itemId}`);
      return { success: true };
    } catch (error) {
      console.error(`[itemVCs] Error issuing ItemCompleted VC:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Public action to add an item with VC issuance.
 * Wraps the addItem mutation and issues an ItemCreated VC.
 */
export const addItemWithVC = action({
  args: {
    listId: v.id("lists"),
    name: v.string(),
    createdByDid: v.string(),
    subOrgId: v.string(), // Turnkey sub-org for signing
    legacyDid: v.optional(v.string()),
    createdAt: v.number(),
    // Optional enhanced fields
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    url: v.optional(v.string()),
    recurrence: v.optional(
      v.object({
        frequency: v.union(
          v.literal("daily"),
          v.literal("weekly"),
          v.literal("monthly")
        ),
        interval: v.optional(v.number()),
        nextDue: v.optional(v.number()),
      })
    ),
    priority: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    parentId: v.optional(v.id("items")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ itemId: Id<"items">; vcIssued: boolean }> => {
    const { subOrgId, ...mutationArgs } = args;

    // First, create the item using the existing mutation
    const { api, internal } = await import("./_generated/api");
    const itemId = await ctx.runMutation(api.items.addItem, mutationArgs);

    // Then, issue the VC (fire-and-forget, don't block on VC issuance)
    let vcIssued = false;
    try {
      const result = await ctx.runAction(internal.itemVCs.issueItemCreatedVC, {
        itemId,
        listId: args.listId,
        itemName: args.name,
        creatorDid: args.createdByDid,
        creatorSubOrgId: subOrgId,
        createdAt: args.createdAt,
      });
      vcIssued = result.success;
    } catch (error) {
      console.error("[itemVCs] Failed to issue ItemCreated VC:", error);
    }

    return { itemId, vcIssued };
  },
});

/**
 * Public action to check an item with VC issuance.
 * Wraps the checkItem mutation and issues an ItemCompleted VC.
 */
export const checkItemWithVC = action({
  args: {
    itemId: v.id("items"),
    checkedByDid: v.string(),
    subOrgId: v.string(), // Turnkey sub-org for signing
    legacyDid: v.optional(v.string()),
    checkedAt: v.number(),
  },
  handler: async (ctx, args): Promise<{ vcIssued: boolean }> => {
    const { subOrgId, ...mutationArgs } = args;

    // Get item info before checking (for VC)
    const { api, internal } = await import("./_generated/api");
    const item = await ctx.runQuery(api.items.getItemForSync, {
      itemId: args.itemId,
    });
    if (!item) {
      throw new Error("Item not found");
    }

    // Check the item
    await ctx.runMutation(api.items.checkItem, mutationArgs);

    // Issue the completion VC
    let vcIssued = false;
    try {
      const result = await ctx.runAction(
        internal.itemVCs.issueItemCompletedVC,
        {
          itemId: args.itemId,
          listId: item.listId,
          itemName: item.name,
          completerDid: args.checkedByDid,
          completerSubOrgId: subOrgId,
          completedAt: args.checkedAt,
        }
      );
      vcIssued = result.success;
    } catch (error) {
      console.error("[itemVCs] Failed to issue ItemCompleted VC:", error);
    }

    return { vcIssued };
  },
});
