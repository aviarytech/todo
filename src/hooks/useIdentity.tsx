/**
 * Identity context and hook for managing user identity.
 *
 * Provides the current user's identity (DID, display name, keys) to all
 * components. The privateKey is exposed because it's needed for signing
 * item actions with verifiable credentials.
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getIdentity, saveIdentity, clearIdentity, type StoredIdentity } from "../lib/identity";
import { createIdentity as createOriginalsIdentity } from "../lib/originals";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface IdentityContextValue {
  did: string | null;
  displayName: string | null;
  privateKey: string | null;
  publicKey: string | null;
  isLoading: boolean;
  hasIdentity: boolean;
  createAndSaveIdentity: (displayName: string) => Promise<void>;
  logout: () => void;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

interface IdentityProviderProps {
  children: ReactNode;
}

export function IdentityProvider({ children }: IdentityProviderProps) {
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const registerUser = useMutation(api.users.registerUser);

  // Load identity from localStorage on mount
  useEffect(() => {
    const stored = getIdentity();
    setIdentity(stored);
    setIsLoading(false);
  }, []);

  const createAndSaveIdentity = useCallback(async (displayName: string) => {
    setIsLoading(true);
    try {
      // Create a new DID identity using Originals SDK
      const originalsIdentity = await createOriginalsIdentity();

      const newIdentity: StoredIdentity = {
        did: originalsIdentity.did,
        displayName,
        privateKey: originalsIdentity.privateKey,
        publicKey: originalsIdentity.publicKey,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      saveIdentity(newIdentity);

      // Register user in Convex
      await registerUser({
        did: newIdentity.did,
        displayName: newIdentity.displayName,
        createdAt: Date.now(),
      });

      setIdentity(newIdentity);
    } finally {
      setIsLoading(false);
    }
  }, [registerUser]);

  const logout = useCallback(() => {
    clearIdentity();
    setIdentity(null);
  }, []);

  const value: IdentityContextValue = {
    did: identity?.did ?? null,
    displayName: identity?.displayName ?? null,
    privateKey: identity?.privateKey ?? null,
    publicKey: identity?.publicKey ?? null,
    isLoading,
    hasIdentity: identity !== null,
    createAndSaveIdentity,
    logout,
  };

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityContextValue {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error("useIdentity must be used within an IdentityProvider");
  }
  return context;
}
