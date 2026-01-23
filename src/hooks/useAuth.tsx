/**
 * Auth context and hook for Turnkey-based authentication.
 *
 * Provides authentication state and OTP flow methods. This runs alongside
 * useIdentity during the migration period. Eventually, useIdentity will be
 * replaced by useAuth throughout the app.
 *
 * Session management is handled by Turnkey via the TurnkeyClient which
 * internally manages session state. No manual token storage needed.
 */

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  initializeTurnkeyClient,
  initOtp,
  completeOtp,
  fetchUser,
  ensureWalletWithAccounts,
  getKeyByCurve,
  TurnkeyDIDSigner,
  TurnkeySessionExpiredError,
  type TurnkeyWallet,
} from "../lib/turnkey";
import type { TurnkeyClient, WalletAccount } from "@turnkey/core";

/**
 * Authenticated user data returned after successful OTP verification.
 */
export interface AuthUser {
  /** Turnkey sub-organization ID */
  turnkeySubOrgId: string;
  /** User's email address */
  email: string;
  /** User's DID (created via Turnkey) */
  did: string;
  /** Display name (defaults to email prefix) */
  displayName: string;
}

/**
 * Auth context value providing authentication state and actions.
 */
interface AuthContextValue {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is loading (checking session, performing OTP, etc.) */
  isLoading: boolean;
  /** Authenticated user data, or null if not authenticated */
  user: AuthUser | null;
  /** Start OTP flow by sending code to email */
  startOtp: (email: string) => Promise<void>;
  /** Verify OTP code and complete authentication */
  verifyOtp: (code: string) => Promise<void>;
  /** Log out and clear session */
  logout: () => void;
  /** Get the Turnkey DID signer for signing operations */
  getSigner: () => TurnkeyDIDSigner | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Internal OTP flow state.
 */
interface OtpFlowState {
  otpId: string | null;
  email: string | null;
}

/**
 * Auth state persisted in localStorage for session recovery.
 * The Turnkey session itself is managed via cookies, but we need
 * to remember user data to avoid re-fetching on every page load.
 */
interface PersistedAuthState {
  user: AuthUser;
  walletAccount: {
    address: string;
    curve: "CURVE_SECP256K1" | "CURVE_ED25519";
    path: string;
    addressFormat: string;
  };
  publicKeyMultibase: string;
}

const AUTH_STORAGE_KEY = "lisa-auth-state";

/**
 * Provides auth context to child components.
 *
 * Wraps the app to provide authentication state via useAuth hook.
 * This provider runs alongside IdentityProvider during migration.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signer, setSigner] = useState<TurnkeyDIDSigner | null>(null);

  // Track OTP flow state (stored in component state, not exposed)
  const [otpFlowState, setOtpFlowState] = useState<OtpFlowState>({
    otpId: null,
    email: null,
  });

  // Turnkey client instance - created once per session
  const turnkeyClientRef = useRef<TurnkeyClient | null>(null);

  // Convex mutation for upserting user
  const upsertUserMutation = useMutation(api.auth.upsertUser);

  /**
   * Get or create Turnkey client instance
   */
  const getTurnkeyClient = useCallback((): TurnkeyClient => {
    if (!turnkeyClientRef.current) {
      turnkeyClientRef.current = initializeTurnkeyClient();
    }
    return turnkeyClientRef.current;
  }, []);

  /**
   * Handle session expiration - clear state and redirect to login
   */
  const handleSessionExpired = useCallback(() => {
    console.log("[useAuth] Session expired, clearing state");
    setUser(null);
    setSigner(null);
    setOtpFlowState({ otpId: null, email: null });
    localStorage.removeItem(AUTH_STORAGE_KEY);
    turnkeyClientRef.current = null;
  }, []);

  /**
   * Create signer from wallet data
   */
  const createSigner = useCallback(
    (
      walletAccount: WalletAccount,
      publicKeyMultibase: string
    ): TurnkeyDIDSigner => {
      const client = getTurnkeyClient();
      return new TurnkeyDIDSigner(
        client,
        walletAccount,
        publicKeyMultibase,
        handleSessionExpired
      );
    },
    [getTurnkeyClient, handleSessionExpired]
  );

  /**
   * Convert address to multibase public key format.
   * For Ed25519 keys in Solana format, the address IS the public key.
   */
  const addressToMultibase = (address: string): string => {
    // For Solana addresses (Ed25519), the address is base58-encoded public key
    // Multibase 'z' prefix indicates base58btc encoding
    return `z${address}`;
  };

  /**
   * Get or create DID for user. Creates did:peer DID from wallet's Ed25519 key.
   * In Phase 1.5, this will be upgraded to use createDIDWithTurnkey for did:webvh.
   */
  const getOrCreateDID = useCallback(
    async (
      wallets: TurnkeyWallet[]
    ): Promise<{ did: string; walletAccount: WalletAccount; publicKeyMultibase: string }> => {
      // Get the required key accounts
      const ed25519Account = getKeyByCurve(wallets, "CURVE_ED25519");

      if (!ed25519Account) {
        throw new Error(
          "No Ed25519 account found in wallet. This should not happen after ensureWalletWithAccounts."
        );
      }

      // For now, we create a did:peer DID using the Ed25519 key
      // In Phase 1.5, this will be upgraded to did:webvh via createDIDWithTurnkey
      const publicKeyMultibase = addressToMultibase(ed25519Account.address);

      // Create a simple did:peer:2 DID from the public key
      // Format: did:peer:2.Vz<key>.Ez<key>
      const did = `did:peer:2.V${publicKeyMultibase}.E${publicKeyMultibase}`;

      console.log("[useAuth] Created DID:", did);

      return {
        did,
        walletAccount: ed25519Account as WalletAccount,
        publicKeyMultibase,
      };
    },
    []
  );

  /**
   * Restore session from localStorage and validate with Turnkey
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedState = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!storedState) {
          console.log("[useAuth] No stored session found");
          setIsLoading(false);
          return;
        }

        const parsed: PersistedAuthState = JSON.parse(storedState);
        console.log("[useAuth] Found stored session, validating...");

        // Validate session with Turnkey by fetching user
        const client = getTurnkeyClient();
        try {
          await fetchUser(client, handleSessionExpired);
          console.log("[useAuth] Session valid, restoring state");

          // Restore state
          setUser(parsed.user);
          const restoredSigner = createSigner(
            parsed.walletAccount as WalletAccount,
            parsed.publicKeyMultibase
          );
          setSigner(restoredSigner);
        } catch (err) {
          if (err instanceof TurnkeySessionExpiredError) {
            console.log("[useAuth] Stored session expired");
            handleSessionExpired();
          } else {
            console.error("[useAuth] Error validating session:", err);
            // Clear potentially invalid state
            handleSessionExpired();
          }
        }
      } catch (err) {
        console.error("[useAuth] Error restoring session:", err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [getTurnkeyClient, handleSessionExpired, createSigner]);

  /**
   * Start OTP flow by sending verification code to email.
   */
  const startOtp = useCallback(
    async (email: string) => {
      setIsLoading(true);
      try {
        const client = getTurnkeyClient();
        console.log("[useAuth] Sending OTP to:", email);

        const otpId = await initOtp(client, email);
        console.log("[useAuth] OTP initiated, id:", otpId);

        setOtpFlowState({ otpId, email });
      } catch (err) {
        console.error("[useAuth] Failed to start OTP:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getTurnkeyClient]
  );

  /**
   * Verify OTP code and complete authentication.
   */
  const verifyOtp = useCallback(
    async (code: string) => {
      if (!otpFlowState.otpId || !otpFlowState.email) {
        throw new Error("OTP flow not started. Call startOtp first.");
      }

      setIsLoading(true);
      try {
        const client = getTurnkeyClient();
        console.log("[useAuth] Verifying OTP...");

        // Complete OTP flow - this authenticates with Turnkey
        const { userId, action } = await completeOtp(
          client,
          otpFlowState.otpId,
          code,
          otpFlowState.email
        );
        console.log(
          "[useAuth] OTP verified, action:",
          action,
          "userId:",
          userId
        );

        // Ensure wallet exists with required accounts
        console.log("[useAuth] Ensuring wallet with accounts...");
        const wallets = await ensureWalletWithAccounts(
          client,
          handleSessionExpired
        );
        console.log("[useAuth] Wallets:", wallets);

        // Get or create DID
        const { did, walletAccount, publicKeyMultibase } = await getOrCreateDID(
          wallets
        );

        // Create auth user object
        const authUser: AuthUser = {
          turnkeySubOrgId: userId,
          email: otpFlowState.email,
          did,
          displayName: otpFlowState.email.split("@")[0],
        };

        // Upsert user in Convex
        console.log("[useAuth] Upserting user in Convex...");
        await upsertUserMutation({
          turnkeySubOrgId: authUser.turnkeySubOrgId,
          email: authUser.email,
          did: authUser.did,
          displayName: authUser.displayName,
        });

        // Create signer for future operations
        const newSigner = createSigner(walletAccount, publicKeyMultibase);

        // Persist auth state
        const persistedState: PersistedAuthState = {
          user: authUser,
          walletAccount: {
            address: walletAccount.address,
            curve: walletAccount.curve as "CURVE_SECP256K1" | "CURVE_ED25519",
            path: walletAccount.path,
            addressFormat: walletAccount.addressFormat,
          },
          publicKeyMultibase,
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistedState));

        // Update state
        setUser(authUser);
        setSigner(newSigner);
        setOtpFlowState({ otpId: null, email: null });

        console.log("[useAuth] Authentication complete");
      } catch (err) {
        console.error("[useAuth] Failed to verify OTP:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      otpFlowState,
      getTurnkeyClient,
      handleSessionExpired,
      getOrCreateDID,
      createSigner,
      upsertUserMutation,
    ]
  );

  /**
   * Log out and clear session.
   */
  const logout = useCallback(() => {
    console.log("[useAuth] Logging out");
    setUser(null);
    setSigner(null);
    setOtpFlowState({ otpId: null, email: null });
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Clear the Turnkey client so a fresh one is created on next login
    turnkeyClientRef.current = null;
  }, []);

  /**
   * Get the Turnkey DID signer for signing operations.
   * Returns null if not authenticated.
   */
  const getSigner = useCallback(() => {
    return signer;
  }, [signer]);

  const value: AuthContextValue = {
    isAuthenticated: user !== null,
    isLoading,
    user,
    startOtp,
    verifyOtp,
    logout,
    getSigner,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 *
 * @returns Auth context value with state and actions
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
