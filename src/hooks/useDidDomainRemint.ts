/**
 * One-shot repair for identities minted on a domain we no longer serve.
 *
 * A did:webvh encodes its domain in the identifier and ours are non-portable,
 * so an identity minted while the app lived on an old host names that host
 * forever — and since a did:webvh resolves by fetching did.jsonl from its own
 * domain, those DIDs are unresolvable and every list published under them fails
 * to verify.
 *
 * The mint must happen here, not on the server: the controller key lives in this
 * browser's localStorage and nowhere else. The same key is reused, so the new
 * DID has the same controller — that is also what authorizes the server swap.
 *
 * TEMPORARY. Delete once no account reports a stale domain; it is a repair pass,
 * not a permanent compatibility layer.
 */

import { useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { createUserWebVHDid, isStaleDidDomain } from "../lib/webvh";
import { Sentry } from "../lib/sentry";

export function useDidDomainRemint(user: {
  did?: string;
  email?: string;
  turnkeySubOrgId?: string;
} | null) {
  const remint = useAction(api.remintDid.remintUserDid);
  // Guards against a second run while the first is in flight — the effect
  // re-fires as `user` identity changes across renders.
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    const did = user?.did;
    const email = user?.email;
    const subOrgId = user?.turnkeySubOrgId;
    if (!did || !email || !subOrgId) return;
    if (!isStaleDidDomain(did)) return;
    if (attempted.current === did) return;
    attempted.current = did;

    void (async () => {
      try {
        // Same localStorage key, current domain — only the domain and SCID move.
        const minted = await createUserWebVHDid({ email, subOrgId });
        const result = await remint({
          oldDid: did,
          newDidLog: minted.didLogJsonl,
          path: minted.path,
        });
        if ("newDid" in result) {
          console.info(`[remint] ${did} -> ${result.newDid} (${result.rewritten} rows)`);
        }
      } catch (err) {
        // Never block login on this. The old DID keeps working as an identifier;
        // it just stays unresolvable until a later attempt succeeds.
        console.error("[remint] failed", err);
        Sentry.captureException(err);
        attempted.current = null;
      }
    })();
  }, [user?.did, user?.email, user?.turnkeySubOrgId, remint]);
}
