"use node";

/**
 * Client-driven re-mint of a user's did:webvh onto the current WEBVH_DOMAIN.
 *
 * The mint has to happen in the browser: a user DID is signed by an Ed25519 key
 * held in that browser's localStorage (see getOrCreateKeyPair in lib/webvh.ts),
 * and the server has never held it. The server's job is to authorize the swap
 * and rewrite the rows.
 *
 * AUTHORIZATION — this matters, because applyRemint reassigns every row owned by
 * one DID to another, which is an account-takeover primitive if it is callable
 * with arbitrary arguments. The app's other mutations trust client-supplied
 * DIDs; this one must not. Instead:
 *
 *   1. The submitted log is RESOLVED, not merely parsed. resolveDIDFromLog
 *      verifies each entry's Data Integrity proof, so a log cannot be forged
 *      without the signing key.
 *   2. Its update keys must intersect the stored log's update keys for oldDid.
 *      Re-mint reuses the same localStorage key, so the honest client always
 *      matches, while an attacker would need the victim's private key.
 *   3. The new DID must land on this deployment's WEBVH_DOMAIN, so this can only
 *      ever move an identity onto the canonical domain.
 *
 * Any failure throws before a single row is touched.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { resolveDIDFromLog } from "didwebvh-ts";
import type { DIDLog } from "didwebvh-ts";

function parseLog(jsonl: string): DIDLog {
  const entries = jsonl
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
  if (entries.length === 0) throw new Error("DID log is empty");
  return entries as DIDLog;
}

function domainOf(did: string): string | null {
  const parts = did.split(":");
  if (parts.length < 5 || parts[1] !== "webvh") return null;
  try {
    return decodeURIComponent(parts[3]);
  } catch {
    return parts[3];
  }
}

export const remintUserDid = action({
  args: {
    oldDid: v.string(),
    newDidLog: v.string(),
    path: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ newDid: string; rewritten: number } | { skipped: string }> => {
    const targetDomain = process.env.WEBVH_DOMAIN;
    if (!targetDomain) throw new Error("WEBVH_DOMAIN is not set on this deployment");

    // (1) Resolve — this verifies every entry's proof, not just its shape.
    const { did: newDid, meta: newMeta } = await resolveDIDFromLog(parseLog(args.newDidLog));

    if (newDid === args.oldDid) return { skipped: "already on the current DID" };

    // (3) Only ever move onto this deployment's canonical domain.
    const newDomain = domainOf(newDid);
    if (newDomain !== targetDomain) {
      throw new Error(`Re-mint must target ${targetDomain}, got ${newDomain ?? "unknown"}`);
    }

    const user = await ctx.runQuery(internal.migrations.remintUserDidDb.findUserByDid, {
      did: args.oldDid,
    });
    if (!user) throw new Error("No user holds that DID");

    // (2) Prove the caller controls the key that controls the OLD DID.
    const oldRecord = await ctx.runQuery(internal.migrations.remintUserDidDb.getDidLogFor, {
      userDid: args.oldDid,
    });
    if (!oldRecord) throw new Error("No stored DID log for the current DID; cannot authorize");

    const { meta: oldMeta } = await resolveDIDFromLog(parseLog(oldRecord.log));
    const shared = newMeta.updateKeys.filter((k) => oldMeta.updateKeys.includes(k));
    if (shared.length === 0) {
      throw new Error("New DID is not controlled by the current DID's update key");
    }

    const { rewritten }: { rewritten: number; skipped: boolean } = await ctx.runMutation(
      internal.migrations.remintUserDidDb.applyRemint,
      { userId: user._id, oldDid: args.oldDid, newDid }
    );

    await ctx.runMutation(internal.migrations.remintUserDidDb.storeDidLog, {
      userDid: newDid,
      path: args.path,
      log: args.newDidLog,
    });

    console.log(`[remintDid] ${args.oldDid} -> ${newDid} (${rewritten} rows)`);
    return { newDid, rewritten };
  },
});
