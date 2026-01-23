/**
 * Auth context and hook for Turnkey-based authentication.
 *
 * Provides authentication state and OTP flow methods. This runs alongside
 * useIdentity during the migration period. Eventually, useIdentity will be
 * replaced by useAuth throughout the app.
 *
 * Session management is handled by Turnkey via httpOnly cookies, so we don't
 * store session tokens in localStorage.
 */

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { TurnkeyDIDSigner } from "../lib/turnkey";

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
 * Provides auth context to child components.
 *
 * Wraps the app to provide authentication state via useAuth hook.
 * This provider runs alongside IdentityProvider during migration.
 */
/**
 * Internal OTP flow state. Stored in a single object to simplify state
 * management and avoid unused variable linter errors during the stub phase.
 */
interface OtpFlowState {
  otpId: string | null;
  email: string | null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signer, setSigner] = useState<TurnkeyDIDSigner | null>(null);

  // Track OTP flow state (stored in component state, not exposed)
  const [otpFlowState, setOtpFlowState] = useState<OtpFlowState>({
    otpId: null,
    email: null,
  });

  /**
   * Start OTP flow by sending verification code to email.
   * Actual implementation will be added in Phase 1.3.
   */
  const startOtp = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      // TODO (Phase 1.3): Implement actual OTP flow
      // const turnkeyClient = initializeTurnkeyClient();
      // const otpId = await initOtp(turnkeyClient, email);
      console.log("[useAuth] startOtp called with email:", email);
      setOtpFlowState({ otpId: "placeholder-otp-id", email });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify OTP code and complete authentication.
   * Actual implementation will be added in Phase 1.3.
   */
  const verifyOtp = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      // TODO (Phase 1.3): Implement actual OTP verification using otpFlowState
      // const turnkeyClient = initializeTurnkeyClient();
      // const { sessionToken, userId, action } = await completeOtp(
      //   turnkeyClient,
      //   otpFlowState.otpId,
      //   code,
      //   otpFlowState.email
      // );
      // ... create DID, fetch wallets, set signer, etc.
      console.log("[useAuth] verifyOtp called with code:", code, "otpFlowState:", otpFlowState);

      // For now, just log - real implementation in Phase 1.3
      // setUser({ ... });
      // setSigner(new TurnkeyDIDSigner(...));
    } finally {
      setIsLoading(false);
    }
  }, [otpFlowState]);

  /**
   * Log out and clear session.
   */
  const logout = useCallback(() => {
    setUser(null);
    setSigner(null);
    setOtpFlowState({ otpId: null, email: null });
    // Turnkey session cleanup happens via cookie expiration
    console.log("[useAuth] logout called");
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
