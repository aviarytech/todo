/**
 * Login page with email input and OTP verification.
 *
 * Two-step flow:
 * 1. User enters email, clicks "Send Code"
 * 2. User enters OTP code from email, clicks "Verify"
 *
 * On successful verification, user is redirected to Home.
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { OtpInput } from "../components/auth/OtpInput";

type LoginStep = "email" | "otp";

interface LoginProps {
  /** If true, don't redirect after authentication (for embedded use in JoinList etc.) */
  embedded?: boolean;
}

export function Login({ embedded = false }: LoginProps) {
  const { startOtp, verifyOtp, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated (unless embedded)
  if (isAuthenticated && !embedded) {
    navigate("/", { replace: true });
    return null;
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      await startOtp(trimmedEmail);
      setStep("otp");
    } catch (err) {
      console.error("Failed to send OTP:", err);
      setError("Failed to send verification code. Please try again.");
    }
  };

  const handleOtpComplete = async (code: string) => {
    setError(null);

    try {
      await verifyOtp(code);
      // On successful verification, useAuth will update isAuthenticated
      // If not embedded, redirect to home; if embedded, parent handles navigation
      if (!embedded) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Failed to verify OTP:", err);
      // Show actual error message for debugging
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setError(null);
  };

  const handleResendOtp = async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      await startOtp(trimmedEmail);
    } catch (err) {
      console.error("Failed to resend OTP:", err);
      setError("Failed to resend verification code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Welcome to Poo App
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          {step === "email"
            ? "Sign in with your email to get started"
            : `Enter the code we sent to ${email}`}
        </p>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit}>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              autoFocus
              autoComplete="email"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending code..." : "Send Code"}
            </button>
          </form>
        ) : (
          <div>
            <OtpInput
              onComplete={handleOtpComplete}
              isLoading={isLoading}
              error={error}
              onResend={handleResendOtp}
            />

            <button
              type="button"
              onClick={handleBackToEmail}
              disabled={isLoading}
              className="mt-4 w-full text-gray-600 py-2 px-4 rounded-md font-medium hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Use a different email
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-500 text-center">
          Your keys are securely managed by Turnkey.
        </p>
      </div>
    </div>
  );
}
