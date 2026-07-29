"use node";

/**
 * Re-mint a user's did:webvh onto the current WEBVH_DOMAIN.
 *
 * Why a re-mint and not an update: did:webvh puts the domain inside the
 * identifier, and these DIDs are created `portable: false` (didCreation.ts:57),
 * so per spec the domain cannot move. A DID minted while the app was served from
 * an old domain names that domain forever — and since a did:webvh resolves by
 * fetching did.jsonl from its own domain, once that domain stops serving, the
 * DID is unresolvable and every list published under it fails to verify.
 *
 * The new DID reuses the SAME Turnkey key and the SAME slug
 * (`user-{subOrgId:16}`), so only the domain and the derived SCID change. The
 * user keeps their keys; only the identifier moves.
 *
 * Dry run first — it only counts rows:
 *   npx convex run --prod migrations/remintUserDid:preview '{"email":"..."}'
 *
 * Then:
 *   npx convex run --prod migrations/remintUserDid:remintByEmail '{"email":"..."}'
 *
 * Idempotent: a user whose DID already sits on WEBVH_DOMAIN is skipped.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

type Candidate = {
  _id: Id<"users">;
  did: string;
  email?: string;
  turnkeySubOrgId?: string;
};

function requireDomain(): string {
  const domain = process.env.WEBVH_DOMAIN;
  if (!domain) throw new Error("WEBVH_DOMAIN is not set on this deployment");
  return domain;
}

function domainOf(did: string): string {
  const parts = did.split(":");
  if (parts.length < 5) throw new Error(`Not a did:webvh with a path: ${did}`);
  return decodeURIComponent(parts[3]);
}

/** Counts what a re-mint would touch. Changes nothing. */
export const preview = internalAction({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<unknown> => {
    const domain = requireDomain();
    const user: Candidate | null = await ctx.runQuery(
      internal.migrations.remintUserDidDb.findUserByEmail,
      { email: args.email }
    );
    if (!user) throw new Error(`No user with email ${args.email}`);

    const current = domainOf(user.did);
    const counts = await ctx.runQuery(internal.migrations.remintUserDidDb.previewRemint, {
      oldDid: user.did,
    });

    return {
      email: args.email,
      currentDid: user.did,
      currentDomain: current,
      targetDomain: domain,
      needsRemint: current !== domain,
      rowsAffected: counts,
    };
  },
});

export const remintByEmail = internalAction({
  args: { email: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ oldDid: string; newDid: string; rewritten: number } | { skipped: string }> => {
    const domain = requireDomain();
    const user: Candidate | null = await ctx.runQuery(
      internal.migrations.remintUserDidDb.findUserByEmail,
      { email: args.email }
    );
    if (!user) throw new Error(`No user with email ${args.email}`);
    if (!user.turnkeySubOrgId) {
      throw new Error(`User ${args.email} has no Turnkey sub-org; cannot re-mint`);
    }
    if (domainOf(user.did) === domain) {
      return { skipped: `${user.did} is already on ${domain}` };
    }

    // Same key, same slug — only the domain (and derived SCID) change.
    const { did: newDid }: { did: string } = await ctx.runAction(
      internal.didCreation.createDIDWebVH,
      { subOrgId: user.turnkeySubOrgId, email: args.email }
    );

    if (newDid === user.did) {
      return { skipped: `re-mint produced the same DID (${newDid})` };
    }

    const { rewritten }: { rewritten: number; skipped: boolean } = await ctx.runMutation(
      internal.migrations.remintUserDidDb.applyRemint,
      { userId: user._id, oldDid: user.did, newDid }
    );

    console.log(`[remintUserDid] ${user.did} -> ${newDid} (${rewritten} rows rewritten)`);
    return { oldDid: user.did, newDid, rewritten };
  },
});
