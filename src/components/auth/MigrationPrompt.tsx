/**
 * @deprecated This component is no longer used after Phase 1.7.
 * Migration is now mandatory - users with localStorage identity are redirected
 * to the Login page where they must authenticate with Turnkey.
 * The legacyDid is passed during the OTP flow to link their old identity.
 *
 * TECH-DEBT: Remove this file after confirming all users have migrated.
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../../hooks/useIdentity";
import { useAuth } from "../../hooks/useAuth";
import { OtpInput } from "./OtpInput";
import { clearIdentity } from "../../lib/identity";
import { dismissMigration } from "../../lib/migration";

interface MigrationPromptProps {
  onDismiss?: () => void;
}

type MigrationStep = "prompt" | "email" | "otp";

/**
 * @deprecated Migration is now mandatory via the Login page.
 */
export function MigrationPrompt({ onDismiss }: MigrationPromptProps) {
  const navigate = useNavigate();
  const { did: legacyDid, displayName } = useIdentity();
  const { startOtp, verifyOtp, isLoading } = useAuth();

  const [step, setStep] = useState<MigrationStep>("prompt");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = () => {
    dismissMigration();
    onDismiss?.();
  };

  const handleStartMigration = () => {
    setStep("email");
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      // Start OTP with legacy DID for migration
      await startOtp(trimmedEmail, legacyDid ?? undefined);
      setStep("otp");
    } catch (err) {
      console.error("[MigrationPrompt] Failed to start OTP:", err);
      setError("Failed to send verification code. Please try again.");
    }
  };

  const handleOtpSubmit = async (code: string) => {
    setError(null);

    try {
      await verifyOtp(code);
      // Migration successful - clear old localStorage identity
      clearIdentity();
      // Navigate to home (now authenticated with Turnkey)
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[MigrationPrompt] Failed to verify OTP:", err);
      setError("Invalid verification code. Please try again.");
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {step === "prompt" && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Upgrade Your Account Security
            </h2>
            <p className="text-gray-600 mb-4">
              Hi {displayName ?? "there"}! We've improved account security with email-based authentication.
              Your lists and data will be preserved.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-1">
                Benefits of upgrading:
              </h3>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Access your lists from any device</li>
                <li>Secure cloud-backed key management</li>
                <li>No more data loss if browser storage is cleared</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStartMigration}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Upgrade Now
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Remind Me Later
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              You can continue using the app without upgrading.
            </p>
          </>
        )}

        {step === "email" && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Enter Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              We'll send you a verification code to complete the upgrade.
            </p>

            <form onSubmit={handleEmailSubmit}>
              <label
                htmlFor="migrationEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <input
                id="migrationEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
                autoFocus
              />

              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send Verification Code"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("prompt")}
                  disabled={isLoading}
                  className="w-full text-gray-600 py-2 px-4 rounded-md font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Enter Verification Code
            </h2>
            <p className="text-gray-600 mb-6">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>

            <OtpInput
              onComplete={handleOtpSubmit}
              isLoading={isLoading}
              error={error}
            />

            <div className="flex flex-col gap-3 mt-4">
              <button
                type="button"
                onClick={handleBackToEmail}
                disabled={isLoading}
                className="w-full text-gray-600 py-2 px-4 rounded-md font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Use different email
              </button>
            </div>

            {isLoading && (
              <p className="mt-4 text-sm text-gray-500 text-center">
                Verifying and migrating your account...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
