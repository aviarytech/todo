/**
 * Shared actor resolver for HTTP handlers.
 *
 * Accepts either an API key (X-API-Key header) or the existing JWT session,
 * and resolves both to a single current DID plus a scope set. This is the only
 * new auth surface: the JWT path is unchanged and always resolves to scopes ["*"].
 */

import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { requireAuth, AuthError } from "./auth";
import { hasScope, hashApiKey } from "./apiKeyHelpers";

export type ResolvedActor = {
  did: string; // owner DID — the authorization identity
  actorDid: string; // who acted: agentDid if the key carries one, else did
  // Legacy DID of a migrated Turnkey user, forwarded so the existing
  // canUserEditList/ownerDid checks still match lists owned under the old DID.
  // Only ever set on the JWT path; API keys are a clean, legacy-free surface.
  legacyDid?: string;
  scopes: string[]; // ["*"] for JWT sessions; the key's scopes otherwise
  viaApiKey: boolean;
};

type UserInfo = { did?: string; legacyDid?: string } | null;

/**
 * Resolve the actor behind a request. Prefers an API key; falls back to JWT.
 * @throws AuthError if neither credential is valid.
 */
export async function resolveActor(
  ctx: ActionCtx,
  request: Request
): Promise<ResolvedActor> {
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    const keyHash = await hashApiKey(apiKey);
    const rec = await ctx.runQuery(api.apiKeys.getByHash, { keyHash });
    if (!rec || rec.revokedAt) {
      throw new AuthError("Invalid API key", "INVALID_TOKEN");
    }
    return {
      did: rec.ownerDid,
      actorDid: rec.agentDid ?? rec.ownerDid,
      scopes: rec.scopes,
      viaApiKey: true,
    };
  }

  const auth = await requireAuth(request);
  const user = (await ctx.runQuery(api.auth.getUserByTurnkeyId, {
    turnkeySubOrgId: auth.turnkeySubOrgId,
  })) as UserInfo;
  if (!user?.did) {
    throw new AuthError("User not found", "UNAUTHORIZED");
  }
  return {
    did: user.did,
    actorDid: user.did,
    legacyDid: user.legacyDid,
    scopes: ["*"],
    viaApiKey: false,
  };
}

/** Throw AuthError if the actor lacks the required scope. */
export function requireScope(actor: ResolvedActor, scope: string): void {
  if (!hasScope(actor.scopes, scope)) {
    throw new AuthError(`Missing scope: ${scope}`, "UNAUTHORIZED");
  }
}
