/**
 * Referral invite landing page — /invite/:code
 *
 * Stores the referral code in localStorage, then redirects to sign-up.
 * After the user authenticates, the ReferralRedeemer component picks up
 * the stored code and calls redeemReferral to award the inviter their bonus.
 */

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const REFERRAL_CODE_KEY = "poo-referral-code";

export function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem(REFERRAL_CODE_KEY, code);
    }

    if (isAuthenticated) {
      // Already logged in — go to app (redemption happens via ReferralRedeemer)
      navigate("/app", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [code, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">💩</div>
        <p className="text-amber-800 font-medium">Getting your invite ready…</p>
      </div>
    </div>
  );
}
