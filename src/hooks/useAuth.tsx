/**
 * Auth context and hook for server-side authentication.
 *
 * Provides authentication state and OTP flow methods. This is the primary
 * authentication mechanism for the app.
 *
 * Authentication flow uses Convex HTTP endpoints:
 * - /auth/initiate - Start OTP flow, get sessionId
 * - /auth/verify - Verify OTP, get JWT token (DID created server-side)
 * - /auth/logout - Clear auth cookie
 *
 * The JWT token is stored in localStorage and sent with API requests.
 * All signing operations (credentials, DIDs) are handled server-side.
 * 
 * Storage uses the async storageAdapter (Capacitor Preferences on native, localStorage on web)
 * for reliable persistence across platforms.
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
import { createUserWebVHDid } from "../lib/webvh";
import { storageAdapter } from "../lib/storageAdapter";

/**
 * Get the Convex HTTP endpoint base URL from the Convex URL.
 *
 * Convex Cloud: https://xxx.convex.cloud -> https://xxx.convex.site
 * Local dev: http://127.0.0.1:3210 -> http://127.0.0.1:3211
 */
function getConvexHttpUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

  // Local development
  if (convexUrl.includes("127.0.0.1") || convexUrl.includes("localhost")) {
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
  /** User's DID (created server-side via Turnkey) */
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
  /** JWT token for API authentication, or null if not authenticated */
  token: string | null;
  /** Start OTP flow by sending code to email. Pass legacyDid for migration. */
  startOtp: (email: string, legacyDid?: string) => Promise<void>;
  /** Verify OTP code and complete authentication */
  verifyOtp: (code: string) => Promise<void>;
  /** Log out and clear session */
  logout: () => Promise<void>;
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
 */
interface PersistedAuthState {
  user: AuthUser;
  /** JWT token for API authentication */
  token: string;
}

const AUTH_STORAGE_KEY = "lisa-auth-state";

/**
 * Provides auth context to child components.
 *
 * Wraps the app to provide authentication state via useAuth hook.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // JWT token for API authentication
  const [token, setToken] = useState<string | null>(null);

  // Track OTP flow state (stored in component state, not exposed)
  const [otpFlowState, setOtpFlowState] = useState<OtpFlowState>({
    sessionId: null,
    email: null,
    legacyDid: null,
  });

  // Track mounted state to prevent setState after unmount
  const isMountedRef = useRef(true);

  /**
   * Restore session from localStorage.
   */
  useEffect(() => {
    // Mark as mounted at start, unmount flag in cleanup
    isMountedRef.current = true;

    const restoreSession = async () => {
      try {
        const storedState = await storageAdapter.get(AUTH_STORAGE_KEY);
        if (!storedState) {
          console.log("[useAuth] No stored session found");
          if (isMountedRef.current) setIsLoading(false);
          return;
        }

        const parsed: PersistedAuthState = JSON.parse(storedState);
        console.log("[useAuth] Found stored session, restoring...");

        // Validate JWT is not expired before restoring
        try {
          const payload = JSON.parse(atob(parsed.token.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.log("[useAuth] Stored token expired, clearing session");
            await storageAdapter.remove(AUTH_STORAGE_KEY);
            await storageAdapter.remove(JWT_STORAGE_KEY);
            if (isMountedRef.current) setIsLoading(false);
            return;
          }
        } catch {
          console.warn("[useAuth] Could not parse JWT for expiry check, proceeding anyway");
        }

        // Restore auth state
        setUser(parsed.user);
        setToken(parsed.token);
        await storageAdapter.set(JWT_STORAGE_KEY, parsed.token);
      } catch (err) {
        console.error("[useAuth] Error restoring session:", err);
        await storageAdapter.remove(AUTH_STORAGE_KEY);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
   * DID is created server-side during verification.
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
        await storageAdapter.set(JWT_STORAGE_KEY, jwtToken);
        setToken(jwtToken);

        // Start with server-provided DID. If it is not already did:webvh,
        // create did:webvh client-side and persist it.
        let userDid = serverUser.did || `did:temp:${serverUser.turnkeySubOrgId}`;
        if (!userDid.startsWith("did:webvh:")) {
          try {
            const webvhResult = await createUserWebVHDid({
              email: serverUser.email,
              subOrgId: serverUser.turnkeySubOrgId,
            });
            userDid = webvhResult.did;

            await fetch(`${httpUrl}/api/user/updateDID`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwtToken}`,
              },
              credentials: "include",
              body: JSON.stringify({ did: userDid }),
            });

            console.log("[useAuth] Upgraded user DID to did:webvh:", userDid);
          } catch (didErr) {
            console.error("[useAuth] Failed to create/update did:webvh:", didErr);
          }
        }

        // Create auth user object
        const authUser: AuthUser = {
          turnkeySubOrgId: serverUser.turnkeySubOrgId,
          email: serverUser.email,
          did: userDid,
          displayName: serverUser.displayName,
        };

        // Persist auth state
        const persistedState: PersistedAuthState = {
          user: authUser,
          token: jwtToken,
        };
        await storageAdapter.set(AUTH_STORAGE_KEY, JSON.stringify(persistedState));

        // Update state
        setUser(authUser);
        setOtpFlowState({ sessionId: null, email: null, legacyDid: null });

        console.log("[useAuth] Authentication complete, DID:", userDid);
      } catch (err) {
        console.error("[useAuth] Failed to verify OTP:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [otpFlowState]
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
    setToken(null);
    setOtpFlowState({ sessionId: null, email: null, legacyDid: null });
    await storageAdapter.remove(AUTH_STORAGE_KEY);
    await storageAdapter.remove(JWT_STORAGE_KEY);
  }, []);

  const value: AuthContextValue = {
    isAuthenticated: user !== null,
    isLoading,
    user,
    token,
    startOtp,
    verifyOtp,
    logout,
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
