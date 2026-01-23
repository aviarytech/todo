/**
 * Unified hook for getting current user identity.
 *
 * During the migration period, this hook provides a consistent interface
 * regardless of whether the user is authenticated via:
 * - Legacy localStorage identity (useIdentity)
 * - Turnkey authentication (useAuth)
 *
 * After migration completes (Phase 1.7), this can be simplified to just useAuth.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useIdentity } from "./useIdentity";
import { useAuth } from "./useAuth";

export interface CurrentUser {
  /** Primary DID (Turnkey DID if authenticated, localStorage DID otherwise) */
  did: string | null;
  /** Legacy DID for migrated users (their old localStorage DID) */
  legacyDid: string | null;
  /** Display name */
  displayName: string | null;
  /** Email (only for Turnkey-authenticated users) */
  email: string | null;
  /** Whether user is authenticated with Turnkey */
  isTurnkeyAuth: boolean;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether user has any identity (legacy or Turnkey) */
  hasIdentity: boolean;
}

/**
 * Get the current user's identity, supporting both auth systems.
 *
 * Priority:
 * 1. If authenticated with Turnkey, use Turnkey identity
 * 2. Otherwise, fall back to localStorage identity
 */
export function useCurrentUser(): CurrentUser {
  const { did: legacyDid, displayName: legacyDisplayName, isLoading: identityLoading, hasIdentity: hasLegacyIdentity } = useIdentity();
  const { isAuthenticated, user: authUser, isLoading: authLoading } = useAuth();

  // If Turnkey authenticated, fetch user record to get legacyDid
  const turnkeyUser = useQuery(
    api.auth.getUserByTurnkeyId,
    isAuthenticated && authUser?.turnkeySubOrgId
      ? { turnkeySubOrgId: authUser.turnkeySubOrgId }
      : "skip"
  );

  const isLoading = identityLoading || authLoading || (isAuthenticated && turnkeyUser === undefined);

  // Turnkey-authenticated user
  if (isAuthenticated && authUser) {
    return {
      did: authUser.did,
      legacyDid: turnkeyUser?.legacyDid ?? null,
      displayName: authUser.displayName,
      email: authUser.email,
      isTurnkeyAuth: true,
      isLoading,
      hasIdentity: true,
    };
  }

  // Legacy localStorage user
  if (hasLegacyIdentity) {
    return {
      did: legacyDid,
      legacyDid: null, // No legacy DID if not migrated - they ARE the legacy user
      displayName: legacyDisplayName,
      email: null,
      isTurnkeyAuth: false,
      isLoading,
      hasIdentity: true,
    };
  }

  // No identity
  return {
    did: null,
    legacyDid: null,
    displayName: null,
    email: null,
    isTurnkeyAuth: false,
    isLoading,
    hasIdentity: false,
  };
}
