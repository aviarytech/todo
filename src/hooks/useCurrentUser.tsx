/**
 * Unified hook for getting current user identity.
 *
 * After Phase 1.7, this hook uses only Turnkey authentication via useAuth.
 * The legacyDid field is preserved to support migrated users who previously
 * had a localStorage identity - their old DID is stored in Convex and used
 * for ownership checks on pre-migration lists.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./useAuth";
import type { TurnkeyDIDSigner } from "../lib/turnkey";

export interface CurrentUser {
  /** User's DID (from Turnkey authentication) */
  did: string | null;
  /** Legacy DID for migrated users (their old localStorage DID, stored in Convex) */
  legacyDid: string | null;
  /** Display name */
  displayName: string | null;
  /** Email address */
  email: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Get the Turnkey signer for signing operations */
  getSigner: () => TurnkeyDIDSigner | null;
}

/**
 * Get the current user's identity from Turnkey authentication.
 *
 * This is the primary hook for accessing user identity throughout the app.
 * It provides the user's DID, display name, email, and access to the
 * Turnkey signer for credential signing operations.
 *
 * For migrated users, the legacyDid field contains their old localStorage DID
 * which is used for backwards-compatible ownership checks on pre-migration lists.
 */
export function useCurrentUser(): CurrentUser {
  const { isAuthenticated, user: authUser, isLoading: authLoading, getSigner } = useAuth();

  // If Turnkey authenticated, fetch user record to get legacyDid
  const turnkeyUser = useQuery(
    api.auth.getUserByTurnkeyId,
    isAuthenticated && authUser?.turnkeySubOrgId
      ? { turnkeySubOrgId: authUser.turnkeySubOrgId }
      : "skip"
  );

  const isLoading = authLoading || (isAuthenticated && turnkeyUser === undefined);

  // Authenticated user
  if (isAuthenticated && authUser) {
    return {
      did: authUser.did,
      legacyDid: turnkeyUser?.legacyDid ?? null,
      displayName: authUser.displayName,
      email: authUser.email,
      isAuthenticated: true,
      isLoading,
      getSigner,
    };
  }

  // Not authenticated
  return {
    did: null,
    legacyDid: null,
    displayName: null,
    email: null,
    isAuthenticated: false,
    isLoading,
    getSigner: () => null,
  };
}
