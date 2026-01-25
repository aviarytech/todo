/**
 * Auth context and hook for server-side authentication.
 *
 * Provides authentication state and OTP flow methods. This is the primary
 * authentication mechanism for the app.
 *
 * Phase 8.4: Auth flow now uses Convex HTTP endpoints for OTP:
 * - /auth/initiate - Start OTP flow, get sessionId
 * - /auth/verify - Verify OTP, get JWT token
 * - /auth/logout - Clear auth cookie
 *
 * The JWT token is stored in localStorage and sent with API requests.
 * TurnkeyDIDSigner is still used for client-side DID signing operations.
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
import {
  initializeTurnkeyClient,
  fetchUser,
  ensureWalletWithAccounts,
  getKeyByCurve,
  TurnkeyDIDSigner,
  TurnkeySessionExpiredError,
  createDIDWithTurnkey,
  type TurnkeyWallet,
} from "../lib/turnkey";
import type { TurnkeyClient, WalletAccount } from "@turnkey/core";

/**
 * Get the Convex HTTP endpoint base URL from the Convex URL.
 *
 * Convex URLs:
 * - Cloud: https://xxx.convex.cloud -> https://xxx.convex.site
 * - Local dev: http://127.0.0.1:3210 -> http://127.0.0.1:3211
 */
function getConvexHttpUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

  // Local development
  if (convexUrl.includes("127.0.0.1") || convexUrl.includes("localhost")) {
    // Replace port 3210 with 3211 for HTTP actions
    return convexUrl.replace(":3210", ":3211");
  }

  // Convex cloud deployment
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

const JWT_STORAGE_KEY = "lisa-jwt-token";

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
 * Result of creating a did:webvh DID
 */
export interface CreateDIDResult {
  did: string;
  didDocument: unknown;
  didLog: unknown;
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
  /** JWT token for API authentication, or null if not authenticated */
  token: string | null;
  /** Start OTP flow by sending code to email. Pass legacyDid for migration. */
  startOtp: (email: string, legacyDid?: string) => Promise<void>;
  /** Verify OTP code and complete authentication */
  verifyOtp: (code: string) => Promise<void>;
  /** Log out and clear session */
  logout: () => Promise<void>;
  /** Get the Turnkey DID signer for signing operations */
  getSigner: () => TurnkeyDIDSigner | null;
  /** Create a did:webvh DID for publishing (Phase 4) */
  createWebvhDID: (domain: string, slug: string) => Promise<CreateDIDResult | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Internal OTP flow state.
 */
interface OtpFlowState {
  /** Session ID from /auth/initiate (used for /auth/verify) */
  sessionId: string | null;
  email: string | null;
  /** Legacy DID being migrated (from localStorage identity) */
  legacyDid: string | null;
}

/**
 * Auth state persisted in localStorage for session recovery.
 * Includes JWT token for API authentication and wallet data for DID signing.
 */
interface PersistedAuthState {
  user: AuthUser;
  /** JWT token for API authentication */
  token: string;
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
  // JWT token for API authentication
  const [token, setToken] = useState<string | null>(null);
  // Store wallet account for did:webvh creation (Phase 4)
  const [walletAccount, setWalletAccount] = useState<WalletAccount | null>(null);
  const [publicKeyMultibase, setPublicKeyMultibase] = useState<string | null>(null);

  // Track OTP flow state (stored in component state, not exposed)
  const [otpFlowState, setOtpFlowState] = useState<OtpFlowState>({
    sessionId: null,
    email: null,
    legacyDid: null,
  });

  // Turnkey client instance - created once per session (for DID signing)
  const turnkeyClientRef = useRef<TurnkeyClient | null>(null);
  // Track mounted state to prevent setState after unmount
  const isMountedRef = useRef(true);

  /**
   * Get or create Turnkey client instance.
   * Returns null if Turnkey client config is not available.
   */
  const getTurnkeyClient = useCallback((): TurnkeyClient | null => {
    if (!turnkeyClientRef.current) {
      try {
        turnkeyClientRef.current = initializeTurnkeyClient();
      } catch (err) {
        console.log("[useAuth] Turnkey client not available (config missing):", err);
        return null;
      }
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
    setToken(null);
    setWalletAccount(null);
    setPublicKeyMultibase(null);
    setOtpFlowState({ sessionId: null, email: null, legacyDid: null });
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(JWT_STORAGE_KEY);
    turnkeyClientRef.current = null;
  }, []);

  /**
   * Create signer from wallet data.
   * Returns null if Turnkey client is not available.
   */
  const createSigner = useCallback(
    (
      walletAccount: WalletAccount,
      publicKeyMultibase: string
    ): TurnkeyDIDSigner | null => {
      const client = getTurnkeyClient();
      if (!client) return null;
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
   * Restore session from localStorage.
   * If Turnkey client is available, also validate and set up wallet access.
   */
  useEffect(() => {
    // Mark as mounted at start, unmount flag in cleanup
    isMountedRef.current = true;

    const restoreSession = async () => {
      try {
        const storedState = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!storedState) {
          console.log("[useAuth] No stored session found");
          if (isMountedRef.current) setIsLoading(false);
          return;
        }

        const parsed: PersistedAuthState = JSON.parse(storedState);
        console.log("[useAuth] Found stored session, restoring...");

        // Restore basic auth state (works without Turnkey client)
        setUser(parsed.user);
        setToken(parsed.token);
        localStorage.setItem(JWT_STORAGE_KEY, parsed.token);

        // Try to set up wallet access if Turnkey client is available
        const client = getTurnkeyClient();
        if (client) {
          try {
            await fetchUser(client, handleSessionExpired);
            if (!isMountedRef.current) return;
            console.log("[useAuth] Turnkey session valid, restoring wallet access");

            const restoredWalletAccount = parsed.walletAccount as WalletAccount;
            const restoredSigner = createSigner(
              restoredWalletAccount,
              parsed.publicKeyMultibase
            );
            setSigner(restoredSigner);
            setWalletAccount(restoredWalletAccount);
            setPublicKeyMultibase(parsed.publicKeyMultibase);
          } catch (err) {
            if (!isMountedRef.current) return;
            if (err instanceof TurnkeySessionExpiredError) {
              console.log("[useAuth] Turnkey session expired, wallet access disabled");
            } else {
              console.log("[useAuth] Could not restore wallet access:", err);
            }
            // Keep basic auth state, just without wallet/signer
          }
        } else {
          console.log("[useAuth] Turnkey client not available, wallet access disabled");
        }
      } catch (err) {
        console.error("[useAuth] Error restoring session:", err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMountedRef.current = false;
    };
  }, [getTurnkeyClient, handleSessionExpired, createSigner]);

  /**
   * Start OTP flow by sending verification code to email.
   * Calls /auth/initiate HTTP endpoint.
   *
   * @param email - User's email address
   * @param legacyDid - Optional: User's old localStorage DID if migrating
   */
  const startOtp = useCallback(
    async (email: string, legacyDid?: string) => {
      setIsLoading(true);
      try {
        console.log("[useAuth] Sending OTP to:", email);
        if (legacyDid) {
          console.log("[useAuth] Migration mode, legacy DID:", legacyDid);
        }

        const httpUrl = getConvexHttpUrl();
        const response = await fetch(`${httpUrl}/auth/initiate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to initiate authentication");
        }

        const { sessionId } = await response.json();
        console.log("[useAuth] OTP initiated, sessionId:", sessionId);

        setOtpFlowState({ sessionId, email, legacyDid: legacyDid ?? null });
      } catch (err) {
        console.error("[useAuth] Failed to start OTP:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Verify OTP code and complete authentication.
   * Calls /auth/verify HTTP endpoint and receives JWT.
   *
   * Note: After server-side OTP verification, we attempt to set up
   * wallet access for DID signing. If Turnkey session is available,
   * the signer will work. Otherwise, signing features will be disabled.
   */
  const verifyOtp = useCallback(
    async (code: string) => {
      if (!otpFlowState.sessionId || !otpFlowState.email) {
        throw new Error("OTP flow not started. Call startOtp first.");
      }

      setIsLoading(true);
      try {
        console.log("[useAuth] Verifying OTP via server...");

        const httpUrl = getConvexHttpUrl();
        const response = await fetch(`${httpUrl}/auth/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies for httpOnly auth cookie
          body: JSON.stringify({
            sessionId: otpFlowState.sessionId,
            code,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Verification failed");
        }

        const { token: jwtToken, user: serverUser } = await response.json();
        console.log("[useAuth] OTP verified, got JWT for:", serverUser.email);

        // Store JWT
        localStorage.setItem(JWT_STORAGE_KEY, jwtToken);
        setToken(jwtToken);

        // Try to set up wallet access for DID signing
        // This works if the user has an existing Turnkey session and client config
        let walletData: {
          did: string;
          walletAccount: WalletAccount;
          publicKeyMultibase: string;
        } | null = null;
        let newSigner: TurnkeyDIDSigner | null = null;

        const client = getTurnkeyClient();
        if (client) {
          try {
            console.log("[useAuth] Attempting to set up wallet access...");
            const wallets = await ensureWalletWithAccounts(client, handleSessionExpired);
            walletData = await getOrCreateDID(wallets);
            newSigner = createSigner(walletData.walletAccount, walletData.publicKeyMultibase);
            console.log("[useAuth] Wallet access established, DID:", walletData.did);
          } catch (walletErr) {
            // Wallet access failed - user doesn't have Turnkey session
            // This is expected in server-side auth flow
            console.log("[useAuth] No Turnkey session available - DID signing disabled");
            console.log("[useAuth] Wallet error:", walletErr);
          }
        } else {
          console.log("[useAuth] Turnkey client not available - DID signing disabled");
        }

        // Create auth user object
        // Use DID from wallet if available, otherwise use server's temp DID
        const authUser: AuthUser = {
          turnkeySubOrgId: serverUser.turnkeySubOrgId,
          email: serverUser.email,
          did: walletData?.did ?? `did:temp:${serverUser.turnkeySubOrgId}`,
          displayName: serverUser.displayName,
        };

        // Persist auth state
        const persistedState: PersistedAuthState = {
          user: authUser,
          token: jwtToken,
          walletAccount: walletData ? {
            address: walletData.walletAccount.address,
            curve: walletData.walletAccount.curve as "CURVE_SECP256K1" | "CURVE_ED25519",
            path: walletData.walletAccount.path,
            addressFormat: walletData.walletAccount.addressFormat,
          } : {
            address: "",
            curve: "CURVE_ED25519",
            path: "",
            addressFormat: "",
          },
          publicKeyMultibase: walletData?.publicKeyMultibase ?? "",
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistedState));

        // Update state
        setUser(authUser);
        setSigner(newSigner);
        if (walletData) {
          setWalletAccount(walletData.walletAccount);
          setPublicKeyMultibase(walletData.publicKeyMultibase);
        }
        setOtpFlowState({ sessionId: null, email: null, legacyDid: null });

        console.log("[useAuth] Authentication complete");
        if (!newSigner) {
          console.log("[useAuth] Note: DID signing is not available until Turnkey session is established");
        }
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
    ]
  );

  /**
   * Log out and clear session.
   * Calls /auth/logout HTTP endpoint to clear the auth cookie.
   */
  const logout = useCallback(async () => {
    console.log("[useAuth] Logging out");

    // Call logout endpoint to clear httpOnly cookie
    try {
      const httpUrl = getConvexHttpUrl();
      await fetch(`${httpUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("[useAuth] Logout endpoint failed:", err);
      // Continue with local cleanup even if server call fails
    }

    // Clear local state
    setUser(null);
    setSigner(null);
    setToken(null);
    setWalletAccount(null);
    setPublicKeyMultibase(null);
    setOtpFlowState({ sessionId: null, email: null, legacyDid: null });
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(JWT_STORAGE_KEY);
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

  /**
   * Create a did:webvh DID for publishing.
   * Returns null if not authenticated or missing required state.
   */
  const createWebvhDID = useCallback(
    async (domain: string, slug: string): Promise<CreateDIDResult | null> => {
      if (!walletAccount || !publicKeyMultibase) {
        console.error("[useAuth] Cannot create DID: missing wallet data");
        return null;
      }

      const client = getTurnkeyClient();
      if (!client) {
        console.error("[useAuth] Cannot create DID: Turnkey client not available");
        return null;
      }

      console.log("[useAuth] Creating did:webvh with domain:", domain, "slug:", slug);

      try {
        const result = await createDIDWithTurnkey({
          turnkeyClient: client,
          updateKeyAccount: walletAccount,
          authKeyPublic: walletAccount.address,
          assertionKeyPublic: walletAccount.address,
          updateKeyPublic: walletAccount.address,
          domain,
          slug,
          onExpired: handleSessionExpired,
        });

        console.log("[useAuth] Created did:webvh:", result.did);
        return result;
      } catch (err) {
        console.error("[useAuth] Failed to create did:webvh:", err);
        throw err;
      }
    },
    [walletAccount, publicKeyMultibase, getTurnkeyClient, handleSessionExpired]
  );

  const value: AuthContextValue = {
    isAuthenticated: user !== null,
    isLoading,
    user,
    token,
    startOtp,
    verifyOtp,
    logout,
    getSigner,
    createWebvhDID,
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
